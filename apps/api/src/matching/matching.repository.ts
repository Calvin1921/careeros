import { Injectable, ConflictException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import type { PipelineDb } from "../pipeline/pipeline.repository";
import type { Criteria } from "./matching.rules";
@Injectable()
export class MatchingRepository {
  transaction<T>(run: (db: PipelineDb) => Promise<T>) {
    return transaction(run);
  }
  async criteria(db: { query: PipelineDb["query"] } = pool) {
    return (
      await db.query(
        "SELECT version,rules,created_at FROM matching_criteria_versions ORDER BY version DESC LIMIT 1",
      )
    ).rows[0] as
      { version: number; rules: Criteria; created_at: string } | undefined;
  }
  async save(rules: Criteria, expectedVersion: number) {
    return transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(78341024)");
      const current = await this.criteria(db);
      if ((current?.version ?? 0) !== expectedVersion)
        throw new ConflictException("Criteria changed. Reload before saving.");
      return (
        await db.query(
          "INSERT INTO matching_criteria_versions(rules) VALUES($1) RETURNING version,rules,created_at",
          [JSON.stringify(rules)],
        )
      ).rows[0];
    });
  }
  async record(
    db: PipelineDb,
    jobId: string,
    snapshotId: string,
    version: number,
    result: { verdict: string; reasons: string[]; gaps: string[] },
  ) {
    await db.query(
      "INSERT INTO job_match_evaluations(id,job_id,snapshot_id,criteria_version,verdict,reasons,gaps) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(snapshot_id,criteria_version) DO NOTHING",
      [
        randomUUID(),
        jobId,
        snapshotId,
        version,
        result.verdict,
        JSON.stringify(result.reasons),
        JSON.stringify(result.gaps),
      ],
    );
  }
  async shortlist(db: PipelineDb, jobId: string, version: number) {
    const app = (
      await db.query(
        "SELECT id,stage FROM applications WHERE job_id=$1 FOR UPDATE",
        [jobId],
      )
    ).rows[0];
    if (app?.stage !== "discovered") return false;
    await db.query(
      "UPDATE applications SET stage='shortlisted',updated_at=now() WHERE id=$1",
      [app.id],
    );
    await db.query(
      "INSERT INTO stage_events(id,application_id,from_stage,to_stage,reason) VALUES($1,$2,'discovered','shortlisted',$3)",
      [
        randomUUID(),
        app.id,
        `Automatic match against criteria version ${version}`,
      ],
    );
    return true;
  }
  async candidates(db: PipelineDb) {
    return (
      await db.query(
        "SELECT DISTINCT ON(j.id) j.id,s.payload->>'title' AS title,s.payload->>'description' AS description,s.payload->'requirements' AS requirements,s.id AS snapshot_id FROM jobs j JOIN applications a ON a.job_id=j.id JOIN job_source_snapshots s ON s.job_id=j.id WHERE a.stage='discovered' ORDER BY j.id,s.created_at DESC,s.id",
      )
    ).rows;
  }
  async results() {
    return (
      await pool.query(
        "SELECT DISTINCT ON(e.job_id) e.*,s.extracted_at FROM job_match_evaluations e JOIN job_source_snapshots s ON s.id=e.snapshot_id ORDER BY e.job_id,e.criteria_version DESC,e.created_at DESC",
      )
    ).rows;
  }
  async history() {
    return (
      await pool.query(
        "SELECT s.id,s.job_id,s.adapter,s.extracted_at,s.created_at,s.extraction_version,s.payload->>'company' AS company,s.payload->>'title' AS title,a.stage,e.verdict,e.reasons,e.gaps,e.criteria_version FROM job_source_snapshots s JOIN jobs j ON j.id=s.job_id JOIN applications a ON a.job_id=j.id LEFT JOIN LATERAL (SELECT * FROM job_match_evaluations e WHERE e.snapshot_id=s.id ORDER BY criteria_version DESC LIMIT 1) e ON true ORDER BY s.extracted_at DESC,s.created_at DESC LIMIT 500",
      )
    ).rows;
  }
}
