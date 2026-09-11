import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import { canTransition, type Stage } from "@careeros/domain";

export class CareerStageConflictError extends Error {}

@Injectable()
export class CareerRepository {
  async health() {
    await pool.query("SELECT 1");
    return { ok: true };
  }
  async jobs() {
    return (
      await pool.query(
        "SELECT j.*,a.stage FROM jobs j JOIN applications a ON a.job_id=j.id ORDER BY j.created_at DESC",
      )
    ).rows;
  }
  async job(id: string) {
    const job = (
      await pool.query(
        "SELECT j.*,a.stage FROM jobs j JOIN applications a ON a.job_id=j.id WHERE j.id=$1",
        [id],
      )
    ).rows[0];
    if (!job) return null;
    const [artifacts, events] = await Promise.all([
      pool.query(
        "SELECT * FROM artifacts WHERE job_id=$1 ORDER BY created_at DESC",
        [id],
      ),
      pool.query(
        "SELECT e.* FROM stage_events e JOIN applications a ON a.id=e.application_id WHERE a.job_id=$1 ORDER BY e.created_at",
        [id],
      ),
    ]);
    return { ...job, artifacts: artifacts.rows, events: events.rows };
  }
  changeStage(id: string, stage: Stage) {
    return transaction(async (db) => {
      const app = (
        await db.query(
          "SELECT * FROM applications WHERE job_id=$1 FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!app) return null;
      if (!canTransition(app.stage, stage))
        throw new CareerStageConflictError("This stage change is not allowed.");
      if (app.stage !== stage) {
        await db.query(
          "UPDATE applications SET stage=$1,updated_at=now() WHERE id=$2",
          [stage, app.id],
        );
        await db.query(
          "INSERT INTO stage_events(id,application_id,from_stage,to_stage) VALUES($1,$2,$3,$4)",
          [randomUUID(), app.id, app.stage, stage],
        );
      }
      return { stage };
    });
  }
  queueArtifact(jobId: string, kind: string) {
    return transaction(async (db) => {
      if (
        !(await db.query("SELECT id FROM jobs WHERE id=$1 FOR UPDATE", [jobId]))
          .rowCount
      )
        return null;
      const existing = (
        await db.query(
          "SELECT id,status FROM artifacts WHERE job_id=$1 AND kind=$2 AND status='queued'",
          [jobId, kind],
        )
      ).rows[0];
      if (existing) return existing;
      const id = randomUUID();
      await db.query("INSERT INTO artifacts(id,job_id,kind) VALUES($1,$2,$3)", [
        id,
        jobId,
        kind,
      ]);
      await db.query("INSERT INTO outbox(id) VALUES($1)", [id]);
      return { id, status: "queued" };
    });
  }
  async capabilities() {
    const [caps, evidence] = await Promise.all([
      pool.query("SELECT * FROM capabilities ORDER BY created_at"),
      pool.query("SELECT * FROM evidence ORDER BY created_at"),
    ]);
    return { caps: caps.rows, evidence: evidence.rows };
  }
  async createCapability(data: {
    name: string;
    technologies: string[];
    transferablePrinciples: string[];
    learningHours: number;
  }) {
    const id = randomUUID();
    await pool.query(
      "INSERT INTO capabilities(id,name,technologies,transferable_principles,learning_hours) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        data.name,
        JSON.stringify(data.technologies),
        JSON.stringify(data.transferablePrinciples),
        data.learningHours,
      ],
    );
    return { id, ...data };
  }
  async createEvidence(data: {
    capabilityId: string;
    kind: string;
    summary: string;
    sourceUrl: string;
    sourceLabel: string;
    verified: boolean;
  }) {
    if (
      !(
        await pool.query("SELECT id FROM capabilities WHERE id=$1", [
          data.capabilityId,
        ])
      ).rowCount
    )
      return null;
    const id = randomUUID();
    await pool.query(
      "INSERT INTO evidence(id,capability_id,kind,summary,source_url,verified,attested_at,source_label) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6 THEN now() ELSE NULL END,$7)",
      [
        id,
        data.capabilityId,
        data.kind,
        data.summary,
        data.sourceUrl,
        data.verified,
        data.sourceLabel,
      ],
    );
    return { id, ...data };
  }
  async analytics() {
    const [stages, events] = await Promise.all([
      pool.query(
        "SELECT stage,count(*)::int AS count FROM applications GROUP BY stage",
      ),
      pool.query("SELECT count(*) FROM stage_events"),
    ]);
    return { stages: stages.rows, eventCount: Number(events.rows[0].count) };
  }
}
