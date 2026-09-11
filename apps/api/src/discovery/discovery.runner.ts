import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import { DiscoveryRepository, type ScanPlan } from "./discovery.repository";
import { PipelineRepository } from "../pipeline/pipeline.repository";
import { MatchingRepository } from "../matching/matching.repository";
import { normalizeSourceUrl } from "../pipeline/pipeline.rules";
import { fetchBoard } from "./greenhouse.source";
import { assessSource, type SourceJob } from "./discovery.rules";
@Injectable()
export class DiscoveryRunner {
  constructor(
    private readonly repository: DiscoveryRepository,
    private readonly pipeline: PipelineRepository,
    private readonly matching: MatchingRepository,
  ) {}
  async execute(
    run: { id: string; attempts: number; plan: ScanPlan },
    fetchSource = fetchBoard,
  ) {
    const reports: Record<string, unknown>[] = [];
    for (const token of run.plan.sources) {
      await this.repository.heartbeat(run.id, run.attempts);
      try {
        const source = await fetchSource(token);
        const counts = {
          checked: source.jobs.length,
          matched: 0,
          review: 0,
          excluded: 0,
          added: 0,
        };
        // One source commits atomically; a failed source cannot look complete.
        await transaction(async (db) => {
          const lease = (
            await db.query(
              "SELECT attempts,status FROM discovery_runs WHERE id=$1 FOR UPDATE",
              [run.id],
            )
          ).rows[0];
          if (lease?.attempts !== run.attempts || lease.status !== "running")
            throw new Error("Scan lease lost.");
          for (const job of [...source.jobs].sort((a, b) =>
            normalizeSourceUrl(a.url) < normalizeSourceUrl(b.url)
              ? -1
              : normalizeSourceUrl(a.url) > normalizeSourceUrl(b.url)
                ? 1
                : 0,
          )) {
            const result = assessSource(job, run.plan.rules, run.plan.skills);
            counts[result.verdict === "match" ? "matched" : result.verdict]++;
            let jobId: string | null = null;
            if (result.verdict === "match") {
              const normalized = normalizeSourceUrl(job.url);
              await this.pipeline.lockNormalizedUrl(db, normalized);
              const existing = await this.pipeline.findJobByNormalizedUrl(
                db,
                normalized,
              );
              const input = {
                originalUrl: job.url,
                title: job.title,
                company: job.company,
                description: `Location listed: ${job.location}\n\n${job.description}`,
                requirements: [],
              };
              jobId =
                existing?.id ??
                (await this.pipeline.insertJob(db, input, normalized));
              const payload = {
                adapter: `greenhouse:${token}`,
                extractedAt: new Date(source.fetchedAt).toISOString(),
                extractionVersion: run.plan.version,
              };
              const key = createHash("sha256")
                .update(JSON.stringify({ ...payload, input }))
                .digest("hex");
              const snapshot = await this.pipeline.insertSnapshot(
                db,
                jobId,
                normalized,
                payload,
                input,
                key,
              );
              await this.matching.record(
                db,
                jobId,
                snapshot,
                run.plan.criteriaVersion,
                result,
              );
              if (
                run.plan.rules.autoShortlist &&
                (await this.matching.shortlist(
                  db,
                  jobId,
                  run.plan.criteriaVersion,
                ))
              )
                counts.added++;
            }
            await db.query(
              "INSERT INTO discovery_results(run_id,source,source_job_id,job_id,title,company,url,location,salary,verdict,reasons,gaps,matched_skills) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(run_id,source,source_job_id) DO UPDATE SET job_id=EXCLUDED.job_id,verdict=EXCLUDED.verdict,reasons=EXCLUDED.reasons,gaps=EXCLUDED.gaps,matched_skills=EXCLUDED.matched_skills",
              [
                run.id,
                token,
                job.id,
                jobId,
                job.title,
                job.company,
                job.url,
                job.location,
                job.salary,
                result.verdict,
                JSON.stringify(result.reasons),
                JSON.stringify(result.gaps),
                JSON.stringify(result.matchedSkills),
              ],
            );
          }
        });
        reports.push({
          token,
          company: source.company,
          status: "completed",
          fetchedAt: source.fetchedAt,
          cached: source.cached,
          ...counts,
        });
      } catch (error) {
        reports.push({
          token,
          status: "failed",
          error: (error as Error).message.slice(0, 300),
        });
      }
      await pool.query(
        "UPDATE discovery_runs SET source_results=$3,lease_until=now()+interval '90 seconds' WHERE id=$1 AND attempts=$2 AND status='running'",
        [run.id, run.attempts, JSON.stringify(reports)],
      );
    }
    const failures = reports.filter((x) => x.status === "failed").length;
    await this.repository.finish(
      run.id,
      run.attempts,
      failures === reports.length
        ? "failed"
        : failures
          ? "partial"
          : "completed",
      reports,
    );
  }
}
