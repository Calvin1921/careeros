import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import type { Stage } from "@careeros/domain";
import type {
  ManualBatchImport,
  ManualStructuredJob,
  NewDecision,
} from "./pipeline.schemas";

export type PipelineDb = Parameters<Parameters<typeof transaction>[0]>[0];

export type DecisionRow = {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class PipelineRepository {
  inTransaction<T>(run: (db: PipelineDb) => Promise<T>) {
    return transaction(run);
  }

  lockNormalizedUrl(db: PipelineDb, normalizedUrl: string) {
    return db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      normalizedUrl,
    ]);
  }

  async findJobByNormalizedUrl(db: PipelineDb, normalizedUrl: string) {
    return (
      await db.query("SELECT id FROM jobs WHERE normalized_url=$1", [
        normalizedUrl,
      ])
    ).rows[0] as { id: string } | undefined;
  }

  async listHistoricJobUrls(db: PipelineDb) {
    return (
      await db.query(
        "SELECT id,url FROM jobs WHERE normalized_url IS NULL ORDER BY created_at,id",
      )
    ).rows as Array<{ id: string; url: string }>;
  }

  async insertJob(
    db: PipelineDb,
    job: ManualStructuredJob,
    normalizedUrl: string,
  ) {
    const jobId = randomUUID();
    const applicationId = randomUUID();
    await db.query(
      "INSERT INTO jobs(id,company,title,url,normalized_url,description,requirements) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        jobId,
        job.company,
        job.title,
        job.originalUrl,
        normalizedUrl,
        job.description,
        JSON.stringify(job.requirements),
      ],
    );
    await db.query("INSERT INTO applications(id,job_id) VALUES($1,$2)", [
      applicationId,
      jobId,
    ]);
    await db.query(
      "INSERT INTO stage_events(id,application_id,to_stage) VALUES($1,$2,'discovered')",
      [randomUUID(), applicationId],
    );
    return jobId;
  }

  async insertSnapshot(
    db: PipelineDb,
    jobId: string,
    normalizedUrl: string,
    input: { adapter: string; extractedAt: string; extractionVersion: string },
    job: ManualStructuredJob,
    snapshotKey: string,
  ) {
    const inserted = (
      await db.query(
        `INSERT INTO job_source_snapshots(
           id,job_id,adapter,original_url,normalized_url,extracted_at,
           extraction_version,payload,snapshot_key
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(snapshot_key) DO NOTHING
         RETURNING id`,
        [
          randomUUID(),
          jobId,
          input.adapter,
          job.originalUrl,
          normalizedUrl,
          input.extractedAt,
          input.extractionVersion,
          JSON.stringify(job),
          snapshotKey,
        ],
      )
    ).rows[0] as { id: string } | undefined;
    if (inserted) return inserted.id;
    return (
      await db.query(
        "SELECT id FROM job_source_snapshots WHERE snapshot_key=$1",
        [snapshotKey],
      )
    ).rows[0].id as string;
  }

  async getOverview(jobId: string) {
    const application = (
      await pool.query(
        `SELECT a.id,a.stage,j.requirements
         FROM applications a JOIN jobs j ON j.id=a.job_id
         WHERE a.job_id=$1`,
        [jobId],
      )
    ).rows[0] as
      { id: string; stage: Stage; requirements: string[] } | undefined;
    if (!application) return undefined;
    const [sources, decisions, events] = await Promise.all([
      pool.query(
        `SELECT id,adapter,original_url,normalized_url,extracted_at,
                extraction_version,created_at
         FROM job_source_snapshots
         WHERE job_id=$1
         ORDER BY extracted_at DESC,created_at DESC`,
        [jobId],
      ),
      pool.query(
        `SELECT id,title,due_date::text AS due_date,completed_at,version,created_at,updated_at
         FROM application_decision_tasks
         WHERE job_id=$1
         ORDER BY completed_at NULLS FIRST,due_date NULLS LAST,created_at`,
        [jobId],
      ),
      pool.query(
        `SELECT id,from_stage,to_stage,event_kind,reason,created_at
         FROM stage_events
         WHERE application_id=$1
         ORDER BY created_at,id`,
        [application.id],
      ),
    ]);
    return {
      stage: application.stage,
      requirements: application.requirements,
      sources: sources.rows,
      decisions: decisions.rows,
      events: events.rows,
    };
  }

  async jobExists(jobId: string) {
    return Boolean(
      (await pool.query("SELECT id FROM jobs WHERE id=$1", [jobId])).rowCount,
    );
  }

  async insertDecision(jobId: string, decision: NewDecision) {
    return (
      await pool.query(
        `INSERT INTO application_decision_tasks(id,job_id,title,due_date)
         VALUES($1,$2,$3,$4)
         RETURNING id,title,due_date::text AS due_date,completed_at,version,created_at,updated_at`,
        [randomUUID(), jobId, decision.title, decision.dueDate],
      )
    ).rows[0] as DecisionRow;
  }

  async findDecisionForUpdate(
    db: PipelineDb,
    jobId: string,
    decisionId: string,
  ) {
    return (
      await db.query(
        `SELECT id,title,due_date::text AS due_date,completed_at,version,created_at,updated_at
         FROM application_decision_tasks
         WHERE id=$1 AND job_id=$2 FOR UPDATE`,
        [decisionId, jobId],
      )
    ).rows[0] as DecisionRow | undefined;
  }

  async updateDecision(
    db: PipelineDb,
    decisionId: string,
    values: {
      title: string;
      dueDate: string | null;
      completedAt: string | null;
    },
  ) {
    return (
      await db.query(
        `UPDATE application_decision_tasks
         SET title=$1,due_date=$2,completed_at=$3,version=version+1,updated_at=now()
         WHERE id=$4
         RETURNING id,title,due_date::text AS due_date,completed_at,version,created_at,updated_at`,
        [values.title, values.dueDate, values.completedAt, decisionId],
      )
    ).rows[0] as DecisionRow;
  }

  async findApplicationForUpdate(db: PipelineDb, jobId: string) {
    return (
      await db.query(
        "SELECT id,stage FROM applications WHERE job_id=$1 FOR UPDATE",
        [jobId],
      )
    ).rows[0] as { id: string; stage: Stage } | undefined;
  }

  updateApplicationStage(db: PipelineDb, applicationId: string, stage: Stage) {
    return db.query(
      "UPDATE applications SET stage=$1,updated_at=now() WHERE id=$2",
      [stage, applicationId],
    );
  }

  async insertCorrectionEvent(
    db: PipelineDb,
    applicationId: string,
    fromStage: Stage,
    toStage: Stage,
    reason: string,
  ) {
    return (
      await db.query(
        `INSERT INTO stage_events(
           id,application_id,from_stage,to_stage,event_kind,reason
         ) VALUES($1,$2,$3,$4,'correction',$5)
         RETURNING id,from_stage,to_stage,event_kind,reason,created_at`,
        [randomUUID(), applicationId, fromStage, toStage, reason],
      )
    ).rows[0];
  }
}
