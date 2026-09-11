import { Injectable } from "@nestjs/common";
import { PipelineNotFoundError } from "./pipeline.errors";
import { PipelineRepository } from "./pipeline.repository";

@Injectable()
export class PipelineQueryService {
  constructor(private readonly repository: PipelineRepository) {}

  async overview(jobId: string) {
    const overview = await this.repository.getOverview(jobId);
    if (!overview) throw new PipelineNotFoundError("Job not found");
    return overview;
  }
}
