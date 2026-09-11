import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import type { PipelineDb } from "../pipeline/pipeline.repository";
import type { PreparationUpdate } from "./preparation.schemas";

export type PreparationJobRow = {
  id: string;
  description: string;
  requirements: unknown;
};

export type PreparationReviewRow = {
  job_id: string;
  requirement_key: string;
  requirement_text: string;
  status: PreparationUpdate["status"];
  evidence_id: string | null;
  evidence_signature: string | null;
  notes: string;
  response: string;
  self_rating: PreparationUpdate["selfRating"];
  version: number;
  created_at: string;
  updated_at: string;
};

export type PreparationEvidenceRow = {
  id: string;
  capability_id: string;
  capability_name: string;
  kind: "learning" | "project" | "production";
  summary: string;
  source_url: string;
  source_label: string;
  verified: boolean;
  attested_at: string | null;
};

export type PreparationTaskRow = {
  requirement_key: string;
  id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class PreparationRepository {
  inTransaction<T>(run: (db: PipelineDb) => Promise<T>) {
    return transaction(run);
  }

  async getJob(jobId: string, db: { query: PipelineDb["query"] } = pool) {
    return (
      await db.query(
        "SELECT id,description,requirements FROM jobs WHERE id=$1",
        [jobId],
      )
    ).rows[0] as PreparationJobRow | undefined;
  }

  async getJobForUpdate(db: PipelineDb, jobId: string) {
    return (
      await db.query(
        "SELECT id,description,requirements FROM jobs WHERE id=$1 FOR UPDATE",
        [jobId],
      )
    ).rows[0] as PreparationJobRow | undefined;
  }

  async appendRequirement(
    db: PipelineDb,
    jobId: string,
    requirements: string[],
  ) {
    await db.query("UPDATE jobs SET requirements=$2 WHERE id=$1", [
      jobId,
      JSON.stringify(requirements),
    ]);
  }

  async listReviews(jobId: string) {
    return (
      await pool.query(
        `SELECT job_id,requirement_key,requirement_text,status,evidence_id,
                evidence_signature,notes,response,self_rating,version,
                created_at,updated_at
         FROM job_preparation_reviews WHERE job_id=$1`,
        [jobId],
      )
    ).rows as PreparationReviewRow[];
  }

  async listEvidence() {
    return (
      await pool.query(
        `SELECT e.id,e.capability_id,c.name AS capability_name,e.kind,e.summary,
                e.source_url,e.source_label,e.verified,e.attested_at
         FROM evidence e JOIN capabilities c ON c.id=e.capability_id
         WHERE e.verified=true AND e.attested_at IS NOT NULL
         ORDER BY c.name,e.kind,e.created_at,e.id`,
      )
    ).rows as PreparationEvidenceRow[];
  }

  async listTasks(jobId: string) {
    return (
      await pool.query(
        `SELECT p.requirement_key,d.id,d.title,d.due_date::text AS due_date,
                d.completed_at,d.version,d.created_at,d.updated_at
         FROM job_preparation_tasks p
         JOIN application_decision_tasks d ON d.id=p.decision_id
         WHERE p.job_id=$1
         ORDER BY p.requirement_key,d.due_date,d.created_at,d.id`,
        [jobId],
      )
    ).rows as PreparationTaskRow[];
  }

  lockKey(db: PipelineDb, value: string) {
    return db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      value,
    ]);
  }

  async findReviewForUpdate(
    db: PipelineDb,
    jobId: string,
    requirementKey: string,
  ) {
    return (
      await db.query(
        `SELECT job_id,requirement_key,requirement_text,status,evidence_id,
                evidence_signature,notes,response,self_rating,version,
                created_at,updated_at
         FROM job_preparation_reviews
         WHERE job_id=$1 AND requirement_key=$2 FOR UPDATE`,
        [jobId, requirementKey],
      )
    ).rows[0] as PreparationReviewRow | undefined;
  }

  async findAttestedEvidence(db: PipelineDb, evidenceId: string) {
    return (
      await db.query(
        `SELECT e.id,e.capability_id,c.name AS capability_name,e.kind,e.summary,
                e.source_url,e.source_label,e.verified,e.attested_at
         FROM evidence e JOIN capabilities c ON c.id=e.capability_id
         WHERE e.id=$1 AND e.verified=true AND e.attested_at IS NOT NULL
         FOR SHARE OF e`,
        [evidenceId],
      )
    ).rows[0] as PreparationEvidenceRow | undefined;
  }

  async insertReview(
    db: PipelineDb,
    jobId: string,
    requirementKey: string,
    requirementText: string,
    value: PreparationUpdate,
    signature: string | null,
  ) {
    return (
      await db.query(
        `INSERT INTO job_preparation_reviews(
           job_id,requirement_key,requirement_text,status,evidence_id,
           evidence_signature,notes,response,self_rating
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING job_id,requirement_key,requirement_text,status,evidence_id,
                   evidence_signature,notes,response,self_rating,version,
                   created_at,updated_at`,
        [
          jobId,
          requirementKey,
          requirementText,
          value.status,
          value.evidenceId,
          signature,
          value.notes,
          value.response,
          value.selfRating,
        ],
      )
    ).rows[0] as PreparationReviewRow;
  }

  async updateReview(
    db: PipelineDb,
    jobId: string,
    requirementKey: string,
    requirementText: string,
    value: PreparationUpdate,
    signature: string | null,
  ) {
    return (
      await db.query(
        `UPDATE job_preparation_reviews
         SET requirement_text=$3,status=$4,evidence_id=$5,
             evidence_signature=$6,notes=$7,response=$8,self_rating=$9,
             version=version+1,updated_at=now()
         WHERE job_id=$1 AND requirement_key=$2
         RETURNING job_id,requirement_key,requirement_text,status,evidence_id,
                   evidence_signature,notes,response,self_rating,version,
                   created_at,updated_at`,
        [
          jobId,
          requirementKey,
          requirementText,
          value.status,
          value.evidenceId,
          signature,
          value.notes,
          value.response,
          value.selfRating,
        ],
      )
    ).rows[0] as PreparationReviewRow;
  }

  async findTask(
    db: PipelineDb,
    jobId: string,
    requirementKey: string,
    dueDate: string,
  ) {
    return (
      await db.query(
        `SELECT p.requirement_key,d.id,d.title,d.due_date::text AS due_date,
                d.completed_at,d.version,d.created_at,d.updated_at
         FROM job_preparation_tasks p
         JOIN application_decision_tasks d ON d.id=p.decision_id
         WHERE p.job_id=$1 AND p.requirement_key=$2 AND p.due_date=$3`,
        [jobId, requirementKey, dueDate],
      )
    ).rows[0] as PreparationTaskRow | undefined;
  }

  async createTask(
    db: PipelineDb,
    jobId: string,
    requirementKey: string,
    requirementText: string,
    dueDate: string,
    title: string,
  ) {
    const decisionId = randomUUID();
    const decision = (
      await db.query(
        `INSERT INTO application_decision_tasks(id,job_id,title,due_date)
         VALUES($1,$2,$3,$4)
         RETURNING id,title,due_date::text AS due_date,completed_at,version,
                   created_at,updated_at`,
        [decisionId, jobId, title, dueDate],
      )
    ).rows[0] as Omit<PreparationTaskRow, "requirement_key">;
    await db.query(
      `INSERT INTO job_preparation_tasks(
         decision_id,job_id,requirement_key,requirement_text,due_date
       ) VALUES($1,$2,$3,$4,$5)`,
      [decisionId, jobId, requirementKey, requirementText, dueDate],
    );
    return { ...decision, requirement_key: requirementKey };
  }
}
