import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import {
  newJob,
  changeStage,
  requestArtifact,
  newCapability,
  newEvidence,
  claimLevel,
} from "@careeros/domain";
import {
  DuplicateJobError,
  PipelineValidationError,
} from "../pipeline/pipeline.errors";
import { PipelineIngestionService } from "../pipeline/pipeline-ingestion.service";
import {
  CareerRepository,
  CareerStageConflictError,
} from "./career.repository";
function parse<T>(
  schema: { safeParse(data: unknown): { success: boolean; data?: T } },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      "Invalid request. Check required fields and formats.",
    );
  return result.data as T;
}
function uuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException("Invalid ID");
  return value;
}
@Injectable()
export class CareerService {
  constructor(
    private readonly repository: CareerRepository,
    private readonly ingestion: PipelineIngestionService,
  ) {}
  health() {
    return this.repository.health();
  }
  list() {
    return this.repository.jobs();
  }
  async create(body: unknown) {
    const data = parse(newJob, body);
    try {
      const result = await this.ingestion.importSingleManualJob(data);
      return (await this.repository.job(result.jobId))!;
    } catch (error) {
      if (error instanceof PipelineValidationError)
        throw new BadRequestException(error.message);
      if (
        error instanceof DuplicateJobError ||
        (error as { code?: string }).code === "23505"
      )
        throw new ConflictException("This job URL is already saved.");
      throw error;
    }
  }
  async detail(value: string) {
    const job = await this.repository.job(uuid(value));
    if (!job) throw new NotFoundException("Job not found.");
    return job;
  }
  async stage(value: string, body: unknown) {
    const id = uuid(value),
      { stage } = parse(changeStage, body);
    try {
      const result = await this.repository.changeStage(id, stage);
      if (!result) throw new NotFoundException("Job not found.");
      return result;
    } catch (error) {
      if (error instanceof CareerStageConflictError)
        throw new ConflictException(error.message);
      throw error;
    }
  }
  async artifact(value: string, body: unknown) {
    const result = await this.repository.queueArtifact(
      uuid(value),
      parse(requestArtifact, body).kind,
    );
    if (!result) throw new NotFoundException("Job not found.");
    return result;
  }
  async capabilities() {
    const { caps, evidence } = await this.repository.capabilities();
    return caps.map((cap) => ({
      ...cap,
      evidence: evidence.filter((e) => e.capability_id === cap.id),
      claimLevel: claimLevel(
        evidence.filter((e) => e.capability_id === cap.id && e.attested_at),
      ),
    }));
  }
  capability(body: unknown) {
    return this.repository.createCapability(parse(newCapability, body));
  }
  async evidence(body: unknown) {
    const result = await this.repository.createEvidence(
      parse(newEvidence, body),
    );
    if (!result) throw new NotFoundException("Capability not found.");
    return result;
  }
  analytics() {
    return this.repository.analytics();
  }
}
