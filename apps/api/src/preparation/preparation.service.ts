import { Injectable } from "@nestjs/common";
import {
  PreparationConflictError,
  PreparationNotFoundError,
  PreparationValidationError,
} from "./preparation.errors";
import {
  PreparationRepository,
  type PreparationEvidenceRow,
  type PreparationReviewRow,
  type PreparationTaskRow,
} from "./preparation.repository";
import {
  assertPreparationVersion,
  evidenceSignature,
  findRequirement,
  requirementEntries,
  type Requirement,
} from "./preparation.rules";
import type { PreparationUpdate } from "./preparation.schemas";

type PublicDecision = {
  id: string;
  title: string;
  dueDate: string;
  completedAt: string | null;
  version: number;
};

function publicDecision(row: PreparationTaskRow): PublicDecision {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    version: row.version,
  };
}

function publicEvidence(row: PreparationEvidenceRow) {
  return {
    id: row.id,
    capabilityId: row.capability_id,
    capabilityName: row.capability_name,
    kind: row.kind,
    summary: row.summary,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    signature: evidenceSignature(row),
  };
}

export function publicReview(
  row: PreparationReviewRow | undefined,
  evidenceById: Map<string, PreparationEvidenceRow>,
) {
  if (!row)
    return {
      status: "unknown" as const,
      evidenceId: null,
      evidenceKind: null,
      notes: "",
      response: "",
      selfRating: null,
      version: 0,
      invalidatedReason: null,
    };

  if (row.status === "direct" || row.status === "transferable") {
    const evidence = row.evidence_id
      ? evidenceById.get(row.evidence_id)
      : undefined;
    if (
      !evidence ||
      !row.evidence_signature ||
      evidenceSignature(evidence) !== row.evidence_signature
    )
      return {
        status: "unknown" as const,
        evidenceId: null,
        evidenceKind: null,
        notes: row.notes,
        response: row.response,
        selfRating: row.self_rating,
        version: row.version,
        invalidatedReason:
          "The evidence changed or is no longer attested. Review this requirement again.",
      };
    return {
      status: row.status,
      evidenceId: evidence.id,
      evidenceKind: evidence.kind,
      notes: row.notes,
      response: row.response,
      selfRating: row.self_rating,
      version: row.version,
      invalidatedReason: null,
    };
  }

  return {
    status: row.status,
    evidenceId: null,
    evidenceKind: null,
    notes: row.notes,
    response: row.response,
    selfRating: row.self_rating,
    version: row.version,
    invalidatedReason: null,
  };
}

@Injectable()
export class PreparationService {
  constructor(private readonly repository: PreparationRepository) {}

  async get(jobId: string) {
    const job = await this.repository.getJob(jobId);
    if (!job) throw new PreparationNotFoundError("Job not found.");
    const [reviewRows, evidenceRows, taskRows] = await Promise.all([
      this.repository.listReviews(jobId),
      this.repository.listEvidence(),
      this.repository.listTasks(jobId),
    ]);
    const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));
    const reviewsByKey = new Map(
      reviewRows.map((row) => [row.requirement_key, row]),
    );
    const tasksByKey = new Map<string, PreparationTaskRow[]>();
    for (const task of taskRows) {
      const items = tasksByKey.get(task.requirement_key) ?? [];
      items.push(task);
      tasksByKey.set(task.requirement_key, items);
    }
    const requirements = requirementEntries(job.requirements).map(
      (requirement) => ({
        ...requirement,
        review: publicReview(reviewsByKey.get(requirement.key), evidenceById),
        evidenceOptions: evidenceRows.map(publicEvidence),
        tasks: (tasksByKey.get(requirement.key) ?? []).map(publicDecision),
      }),
    );
    return {
      jobId,
      summary: {
        total: requirements.length,
        reviewed: requirements.filter(
          (item) => item.review.status !== "unknown",
        ).length,
        practiced: requirements.filter((item) => !!item.review.response.trim())
          .length,
        ready: requirements.filter(
          (item) =>
            item.review.status !== "unknown" &&
            !!item.review.response.trim() &&
            item.review.selfRating === "ready",
        ).length,
      },
      requirements,
    };
  }

  async addRequirement(jobId: string, text: string) {
    return this.repository.inTransaction(async (db) => {
      const job = await this.repository.getJobForUpdate(db, jobId);
      if (!job) throw new PreparationNotFoundError("Job not found.");
      if (!job.description.includes(text))
        throw new PreparationValidationError(
          "Requirement text must be an exact excerpt from the saved job description.",
        );
      const requirements = requirementEntries(job.requirements);
      const existing = requirements.find((item) => item.text === text);
      if (existing) return { ...existing, reused: true };
      const rawRequirements = Array.isArray(job.requirements)
        ? job.requirements.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      if (rawRequirements.length >= 30)
        throw new PreparationValidationError(
          "A job can contain at most 30 requirements.",
        );
      rawRequirements.push(text);
      await this.repository.appendRequirement(db, jobId, rawRequirements);
      const created = requirementEntries(rawRequirements).at(-1)!;
      return { ...created, reused: false };
    });
  }

  async update(
    jobId: string,
    requirementKey: string,
    value: PreparationUpdate,
  ) {
    return this.repository.inTransaction(async (db) => {
      await this.repository.lockKey(
        db,
        `preparation-review:${jobId}:${requirementKey}`,
      );
      const job = await this.repository.getJob(jobId, db);
      if (!job) throw new PreparationNotFoundError("Job not found.");
      const requirement = this.requirement(job.requirements, requirementKey);
      const current = await this.repository.findReviewForUpdate(
        db,
        jobId,
        requirementKey,
      );
      assertPreparationVersion(current?.version, value.expectedVersion);
      let evidence: PreparationEvidenceRow | undefined;
      if (value.evidenceId) {
        evidence = await this.repository.findAttestedEvidence(
          db,
          value.evidenceId,
        );
        if (!evidence)
          throw new PreparationConflictError(
            "Selected evidence must still be verified and explicitly attested.",
          );
      }
      const signature = evidence ? evidenceSignature(evidence) : null;
      if (evidence && signature !== value.expectedEvidenceSignature)
        throw new PreparationConflictError(
          "Selected evidence changed. Reload and review the current evidence before saving.",
        );
      const saved = current
        ? await this.repository.updateReview(
            db,
            jobId,
            requirementKey,
            requirement.text,
            value,
            signature,
          )
        : await this.repository.insertReview(
            db,
            jobId,
            requirementKey,
            requirement.text,
            value,
            signature,
          );
      return publicReview(
        saved,
        new Map(evidence ? [[evidence.id, evidence]] : []),
      );
    });
  }

  async createTask(jobId: string, requirementKey: string, dueDate: string) {
    return this.repository.inTransaction(async (db) => {
      await this.repository.lockKey(
        db,
        `preparation-task:${jobId}:${requirementKey}:${dueDate}`,
      );
      const job = await this.repository.getJob(jobId, db);
      if (!job) throw new PreparationNotFoundError("Job not found.");
      const requirement = this.requirement(job.requirements, requirementKey);
      const existing = await this.repository.findTask(
        db,
        jobId,
        requirementKey,
        dueDate,
      );
      if (existing)
        return {
          requirementKey,
          reused: true,
          decision: publicDecision(existing),
        };
      const title = `Prepare: ${requirement.text}`.slice(0, 500);
      const created = await this.repository.createTask(
        db,
        jobId,
        requirementKey,
        requirement.text,
        dueDate,
        title,
      );
      return {
        requirementKey,
        reused: false,
        decision: publicDecision(created),
      };
    });
  }

  private requirement(value: unknown, key: string): Requirement {
    const requirement = findRequirement(value, key);
    if (!requirement)
      throw new PreparationNotFoundError(
        "Requirement is not part of the current job description.",
      );
    return requirement;
  }
}
