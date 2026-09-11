import { Injectable } from "@nestjs/common";
import { PipelineNotFoundError } from "./pipeline.errors";
import { PipelineRepository } from "./pipeline.repository";
import { assertDecisionVersion } from "./pipeline.rules";
import type { NewDecision, UpdateDecision } from "./pipeline.schemas";

@Injectable()
export class PipelineDecisionsService {
  constructor(private readonly repository: PipelineRepository) {}

  async create(jobId: string, decision: NewDecision) {
    if (!(await this.repository.jobExists(jobId)))
      throw new PipelineNotFoundError("Job not found");
    return this.repository.insertDecision(jobId, decision);
  }

  update(jobId: string, decisionId: string, update: UpdateDecision) {
    return this.repository.inTransaction(async (db) => {
      const current = await this.repository.findDecisionForUpdate(
        db,
        jobId,
        decisionId,
      );
      if (!current) throw new PipelineNotFoundError("Decision not found");
      assertDecisionVersion(current.version, update.expectedVersion);
      const completedAt =
        update.completed === undefined
          ? current.completed_at
          : update.completed
            ? new Date().toISOString()
            : null;
      return this.repository.updateDecision(db, decisionId, {
        title: update.title ?? current.title,
        dueDate:
          update.dueDate === undefined ? current.due_date : update.dueDate,
        completedAt,
      });
    });
  }
}
