import { Injectable } from "@nestjs/common";
import { PipelineNotFoundError } from "./pipeline.errors";
import { PipelineRepository } from "./pipeline.repository";
import { assertCorrectionCurrentStage } from "./pipeline.rules";
import type { StageCorrection } from "./pipeline.schemas";

@Injectable()
export class PipelineStageService {
  constructor(private readonly repository: PipelineRepository) {}

  correct(jobId: string, correction: StageCorrection) {
    return this.repository.inTransaction(async (db) => {
      const application = await this.repository.findApplicationForUpdate(
        db,
        jobId,
      );
      if (!application) throw new PipelineNotFoundError("Job not found");
      assertCorrectionCurrentStage(application.stage, correction);
      await this.repository.updateApplicationStage(
        db,
        application.id,
        correction.toStage,
      );
      const event = await this.repository.insertCorrectionEvent(
        db,
        application.id,
        correction.fromStage,
        correction.toStage,
        correction.reason,
      );
      return { stage: correction.toStage, event };
    });
  }
}
