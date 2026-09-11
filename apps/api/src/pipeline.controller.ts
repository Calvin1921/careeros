import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { PipelineDecisionsService } from "./pipeline/pipeline-decisions.service";
import {
  PipelineConflictError,
  PipelineNotFoundError,
  PipelineValidationError,
} from "./pipeline/pipeline.errors";
import { PipelineIngestionService } from "./pipeline/pipeline-ingestion.service";
import { PipelineQueryService } from "./pipeline/pipeline-query.service";
import {
  manualBatchImportSchema,
  newDecisionSchema,
  stageCorrectionSchema,
  updateDecisionSchema,
  uuidSchema,
} from "./pipeline/pipeline.schemas";
import { PipelineStageService } from "./pipeline/pipeline-stage.service";

async function transport<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PipelineValidationError)
      throw new BadRequestException(error.message);
    if (error instanceof PipelineNotFoundError)
      throw new NotFoundException(error.message);
    if (
      error instanceof PipelineConflictError ||
      (error as { code?: string }).code === "23505"
    )
      throw new ConflictException(
        error instanceof Error
          ? error.message
          : "A matching record changed concurrently.",
      );
    throw error;
  }
}

@Controller()
export class PipelineController {
  constructor(
    private readonly ingestion: PipelineIngestionService,
    private readonly queries: PipelineQueryService,
    private readonly decisions: PipelineDecisionsService,
    private readonly stages: PipelineStageService,
  ) {}

  @Post("pipeline/imports")
  importStructuredJobs(@Body() body: unknown) {
    return transport(() =>
      this.ingestion.importStructuredJobs(manualBatchImportSchema.parse(body)),
    );
  }

  @Get("jobs/:id/pipeline")
  overview(@Param("id") id: string) {
    return transport(() => this.queries.overview(uuidSchema.parse(id)));
  }

  @Post("jobs/:id/decisions")
  createDecision(@Param("id") id: string, @Body() body: unknown) {
    return transport(() =>
      this.decisions.create(
        uuidSchema.parse(id),
        newDecisionSchema.parse(body),
      ),
    );
  }

  @Patch("jobs/:jobId/decisions/:decisionId")
  updateDecision(
    @Param("jobId") jobId: string,
    @Param("decisionId") decisionId: string,
    @Body() body: unknown,
  ) {
    return transport(() =>
      this.decisions.update(
        uuidSchema.parse(jobId),
        uuidSchema.parse(decisionId),
        updateDecisionSchema.parse(body),
      ),
    );
  }

  @Patch("jobs/:id/stage-correction")
  correctStage(@Param("id") id: string, @Body() body: unknown) {
    return transport(() =>
      this.stages.correct(
        uuidSchema.parse(id),
        stageCorrectionSchema.parse(body),
      ),
    );
  }
}
