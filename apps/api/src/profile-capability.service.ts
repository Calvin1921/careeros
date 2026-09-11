import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import {
  dateOnly,
  evidenceKinds,
  evidenceVerificationAfterPatch,
  httpUrl,
  milestoneStatuses,
  object,
  oneOf,
  optionalString,
  parseCapabilityPatch,
  requiredString,
  uuid,
} from "./profile.shared";

@Injectable()
export class ProfileCapabilityService {
  async updateCapability(idValue: string, body: unknown) {
    const id = uuid(idValue),
      value = parseCapabilityPatch(body);
    const row = (
      await pool.query(
        `UPDATE capabilities SET name=COALESCE($2,name),technologies=COALESCE($3,technologies),transferable_principles=COALESCE($4,transferable_principles),learning_hours=COALESCE($5,learning_hours),updated_at=now() WHERE id=$1 RETURNING *`,
        [
          id,
          value.name,
          value.technologies === undefined
            ? null
            : JSON.stringify(value.technologies),
          value.transferablePrinciples === undefined
            ? null
            : JSON.stringify(value.transferablePrinciples),
          value.learningHours ?? null,
        ],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Capability not found.");
    return row;
  }
  async updateEvidence(idValue: string, body: unknown) {
    const id = uuid(idValue),
      data = object(body);
    if (
      !["kind", "summary", "sourceUrl", "sourceLabel", "attested"].some(
        (key) => data[key] !== undefined,
      )
    )
      throw new BadRequestException(
        "Provide at least one evidence field to update.",
      );
    if (data.attested !== undefined && typeof data.attested !== "boolean")
      throw new BadRequestException("Attested must be true or false.");
    return transaction(async (db) => {
      // Evidence edits and milestone completion share one lock order before row locks.
      await db.query("SELECT pg_advisory_xact_lock(78341023)");
      const current = (
        await db.query("SELECT * FROM evidence WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!current) throw new NotFoundException("Evidence not found.");
      const next = {
        kind:
          data.kind === undefined
            ? current.kind
            : oneOf(data.kind, evidenceKinds, "Evidence kind"),
        summary:
          data.summary === undefined
            ? current.summary
            : requiredString(data.summary, "Evidence summary", 5, 3000),
        sourceUrl:
          data.sourceUrl === undefined
            ? current.source_url
            : httpUrl(
                requiredString(data.sourceUrl, "Source URL", 1, 1000),
                "Source URL",
              ),
        sourceLabel:
          optionalString(data.sourceLabel, "Source label", 500) ??
          current.source_label,
      };
      const verification = evidenceVerificationAfterPatch(current, data);
      const row = (
        await db.query(
          `UPDATE evidence SET kind=$2,summary=$3,source_url=$4,source_label=$5,verified=$6,attested_at=CASE WHEN $7 THEN now() ELSE NULL END,updated_at=now() WHERE id=$1 RETURNING *`,
          [
            id,
            next.kind,
            next.summary,
            next.sourceUrl,
            next.sourceLabel,
            verification.verified,
            verification.attested,
          ],
        )
      ).rows[0];
      if (!verification.verified || next.kind === "learning")
        await db.query(
          "UPDATE learning_milestones SET status='in-progress',evidence_id=NULL,updated_at=now() WHERE evidence_id=$1 AND status='completed'",
          [id],
        );
      return row;
    });
  }
  async createMilestone(body: unknown) {
    const data = object(body),
      capabilityId = uuid(data.capabilityId, "Capability ID"),
      value = this.input(data);
    return transaction(async (db) => {
      // Evidence edits and milestone completion share one lock order before row locks.
      await db.query("SELECT pg_advisory_xact_lock(78341023)");
      if (
        !(
          await db.query("SELECT id FROM capabilities WHERE id=$1", [
            capabilityId,
          ])
        ).rowCount
      )
        throw new NotFoundException("Capability not found.");
      if (value.status === "completed")
        await this.assertPracticalEvidence(db, capabilityId, value.evidenceId);
      const row = (
        await db.query(
          `INSERT INTO learning_milestones(id,capability_id,title,week_start,weekly_hours,practical_evidence_goal,status,evidence_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *,week_start::text AS week_start`,
          [
            randomUUID(),
            capabilityId,
            value.title,
            value.weekStart,
            value.weeklyHours,
            value.practicalEvidenceGoal,
            value.status,
            value.evidenceId,
          ],
        )
      ).rows[0];
      return { ...row, weekly_hours: Number(row.weekly_hours) };
    });
  }
  async updateMilestone(idValue: string, body: unknown) {
    const id = uuid(idValue),
      data = object(body);
    return transaction(async (db) => {
      // Evidence edits and milestone completion share one lock order before row locks.
      await db.query("SELECT pg_advisory_xact_lock(78341023)");
      const current = (
        await db.query(
          "SELECT *,week_start::text AS week_start FROM learning_milestones WHERE id=$1 FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!current)
        throw new NotFoundException("Learning milestone not found.");
      const value = this.input(data, current);
      if (value.status === "completed")
        await this.assertPracticalEvidence(
          db,
          current.capability_id,
          value.evidenceId,
        );
      const row = (
        await db.query(
          `UPDATE learning_milestones SET title=$2,week_start=$3,weekly_hours=$4,practical_evidence_goal=$5,status=$6,evidence_id=$7,updated_at=now() WHERE id=$1 RETURNING *,week_start::text AS week_start`,
          [
            id,
            value.title,
            value.weekStart,
            value.weeklyHours,
            value.practicalEvidenceGoal,
            value.status,
            value.evidenceId,
          ],
        )
      ).rows[0];
      return { ...row, weekly_hours: Number(row.weekly_hours) };
    });
  }
  private input(
    data: Record<string, unknown>,
    current?: Record<string, unknown>,
  ) {
    const hours =
      data.weeklyHours === undefined
        ? Number(current?.weekly_hours)
        : data.weeklyHours;
    if (
      typeof hours !== "number" ||
      !Number.isFinite(hours) ||
      hours < 0 ||
      hours > 168
    )
      throw new BadRequestException("Weekly hours must be from 0 to 168.");
    const rawEvidence =
      data.evidenceId === undefined ? current?.evidence_id : data.evidenceId;
    return {
      title: requiredString(
        data.title ?? current?.title,
        "Milestone title",
        1,
        300,
      ),
      weekStart: dateOnly(
        data.weekStart ?? String(current?.week_start).slice(0, 10),
        "Week start",
      ),
      weeklyHours: hours,
      practicalEvidenceGoal: requiredString(
        data.practicalEvidenceGoal ?? current?.practical_evidence_goal,
        "Practical evidence goal",
        5,
        2000,
      ),
      status: oneOf(
        data.status ?? current?.status,
        milestoneStatuses,
        "Milestone status",
      ),
      evidenceId:
        rawEvidence === null || rawEvidence === undefined || rawEvidence === ""
          ? null
          : uuid(rawEvidence, "Evidence ID"),
    };
  }
  private async assertPracticalEvidence(
    db: {
      query: (
        sql: string,
        values?: unknown[],
      ) => Promise<{ rowCount: number | null }>;
    },
    capabilityId: string,
    evidenceId: string | null,
  ) {
    if (!evidenceId)
      throw new ConflictException(
        "Completed milestones need attested project or production evidence.",
      );
    const result = await db.query(
      "SELECT id FROM evidence WHERE id=$1 AND capability_id=$2 AND kind IN ('project','production') AND verified=true AND attested_at IS NOT NULL FOR SHARE",
      [evidenceId, capabilityId],
    );
    if (!result.rowCount)
      throw new ConflictException(
        "This evidence is not attested practical evidence for the capability.",
      );
  }
}
