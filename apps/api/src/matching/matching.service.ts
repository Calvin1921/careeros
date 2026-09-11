import { Injectable } from "@nestjs/common";
import { MatchingRepository } from "./matching.repository";
import { assessJob, type MatchInput } from "./matching.rules";
import { parseCriteria } from "./matching.schemas";
import type { PipelineDb } from "../pipeline/pipeline.repository";
@Injectable()
export class MatchingService {
  constructor(private readonly repository: MatchingRepository) {}
  async criteria() {
    return (await this.repository.criteria()) ?? { version: 0, rules: null };
  }
  save(input: unknown) {
    const { expectedVersion, ...rules } = parseCriteria(input);
    return this.repository.save(rules, expectedVersion);
  }
  results() {
    return this.repository.results();
  }
  history() {
    return this.repository.history();
  }
  async evaluate(
    db: PipelineDb,
    jobId: string,
    snapshotId: string,
    input: MatchInput,
  ) {
    const criteria = await this.repository.criteria(db);
    if (!criteria) return { evaluated: false, shortlisted: false };
    const result = assessJob(input, criteria.rules);
    await this.repository.record(
      db,
      jobId,
      snapshotId,
      criteria.version,
      result,
    );
    const shortlisted =
      result.verdict === "match" && criteria.rules.autoShortlist
        ? await this.repository.shortlist(db, jobId, criteria.version)
        : false;
    return { evaluated: true, shortlisted };
  }
  process() {
    return this.repository.transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(78341024)");
      const jobs = await this.repository.candidates(db);
      let evaluated = 0,
        shortlisted = 0;
      for (const job of jobs) {
        const result = await this.evaluate(db, job.id, job.snapshot_id, job);
        evaluated += Number(result.evaluated);
        shortlisted += Number(result.shortlisted);
      }
      return { evaluated, shortlisted };
    });
  }
}
