import type { ConversationFact } from "../conversation-facts.rules";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import type { Criteria } from "../matching/matching.rules";
export type ScanPlan = {
  criteriaVersion: number;
  rules: Criteria;
  skills: string[];
  sources: string[];
  cvImportId: string | null;
  conversationFacts?: ConversationFact[];
  version: string;
};
@Injectable()
export class DiscoveryRepository {
  async settings() {
    return (
      await pool.query("SELECT * FROM discovery_settings WHERE singleton=true")
    ).rows[0];
  }
  async saveSettings(sources: string[], times: string[]) {
    return (
      await pool.query(
        "UPDATE discovery_settings SET sources=$1,schedule_times=$2,updated_at=now() WHERE singleton=true RETURNING *",
        [JSON.stringify(sources), JSON.stringify(times)],
      )
    ).rows[0];
  }
  async profile() {
    const cv = (
      await pool.query(
        "SELECT id,original_text FROM cv_imports ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    const experiences = (
      await pool.query(
        "SELECT role_title,summary FROM profile_experiences WHERE status='confirmed'",
      )
    ).rows;
    const conversationFacts = (
      await pool.query(
        'SELECT field,value,evidence,confirmed_at AS "confirmedAt" FROM conversation_profile_facts ORDER BY field',
      )
    ).rows as ConversationFact[];
    return {
      conversationFacts,
      cvImportId: cv?.id ?? null,
      text: [
        cv?.original_text ?? "",
        ...experiences.map((x) => `${x.role_title} ${x.summary}`),
      ].join("\n"),
    };
  }
  async runs() {
    return (
      await pool.query(
        "SELECT * FROM discovery_runs ORDER BY created_at DESC LIMIT 12",
      )
    ).rows;
  }
  async results(runId: string, verdict: string, offset: number) {
    const values = [runId, verdict];
    const rows = await pool.query(
      "SELECT r.*,a.stage FROM discovery_results r LEFT JOIN applications a ON a.job_id=r.job_id WHERE run_id=$1 AND ($2='all' OR verdict=$2) ORDER BY jsonb_array_length(matched_skills) DESC,company,title,source_job_id LIMIT 50 OFFSET $3",
      [...values, offset],
    );
    const count = await pool.query(
      "SELECT count(*)::int AS total FROM discovery_results WHERE run_id=$1 AND ($2='all' OR verdict=$2)",
      values,
    );
    return { items: rows.rows, total: count.rows[0].total };
  }
  async enqueue(plan: ScanPlan, trigger: string, slot: string | null) {
    return transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(78341030)");
      const active = (
        await db.query(
          "SELECT * FROM discovery_runs WHERE status IN ('queued','running') LIMIT 1",
        )
      ).rows[0];
      if (active) return { ...active, reused: true };
      if (slot) {
        const previous = (
          await db.query(
            "SELECT * FROM discovery_runs WHERE schedule_slot=$1",
            [slot],
          )
        ).rows[0];
        if (previous) return { ...previous, reused: true };
      }
      return (
        await db.query(
          "INSERT INTO discovery_runs(id,trigger,schedule_slot,plan) VALUES($1,$2,$3,$4) RETURNING *",
          [randomUUID(), trigger, slot, JSON.stringify(plan)],
        )
      ).rows[0];
    });
  }
  async claim() {
    return transaction(async (db) => {
      await db.query(
        "UPDATE discovery_runs SET status='failed',error='The scan worker stopped repeatedly. Try scanning again.',finished_at=now() WHERE status='running' AND lease_until<now() AND attempts>=3",
      );
      const row = (
        await db.query(
          "SELECT * FROM discovery_runs WHERE status='queued' OR (status='running' AND lease_until<now()) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
        )
      ).rows[0];
      if (!row) return null;
      return (
        await db.query(
          "UPDATE discovery_runs SET status='running',attempts=attempts+1,started_at=COALESCE(started_at,now()),lease_until=now()+interval '90 seconds' WHERE id=$1 RETURNING *",
          [row.id],
        )
      ).rows[0];
    });
  }
  async heartbeat(id: string, attempt: number) {
    const result = await pool.query(
      "UPDATE discovery_runs SET lease_until=now()+interval '90 seconds' WHERE id=$1 AND attempts=$2 AND status='running'",
      [id, attempt],
    );
    if (!result.rowCount) throw new Error("Scan lease lost.");
  }
  async finish(
    id: string,
    attempt: number,
    status: string,
    sources: unknown[],
  ) {
    await pool.query(
      "UPDATE discovery_runs SET status=$3,source_results=$4,finished_at=now(),lease_until=NULL WHERE id=$1 AND attempts=$2 AND status='running'",
      [id, attempt, status, JSON.stringify(sources)],
    );
  }
}
