import { MatchingService } from "../matching/matching.service";
import { Injectable } from "@nestjs/common";
import { DuplicateJobError } from "./pipeline.errors";
import { manualFormImport, type ManualJobForm } from "./manual-source.adapter";
import { PipelineRepository, type PipelineDb } from "./pipeline.repository";
import { normalizeSourceUrl, sourceSnapshotKey } from "./pipeline.rules";
import type { ManualBatchImport } from "./pipeline.schemas";

export type ImportResult = {
  index: number;
  status: "created" | "duplicate";
  jobId: string;
  normalizedUrl: string;
  snapshotId: string;
};

@Injectable()
export class PipelineIngestionService {
  constructor(
    private readonly repository: PipelineRepository,
    private readonly matching: MatchingService,
  ) {}

  importStructuredJobs(input: ManualBatchImport) {
    return this.repository.inTransaction((db) => this.importBatch(db, input));
  }

  async importSingleManualJob(
    job: ManualJobForm,
    extractedAt = new Date().toISOString(),
  ) {
    const result = (
      await this.importStructuredJobs(manualFormImport(job, extractedAt))
    )[0]!;
    if (result.status === "duplicate")
      throw new DuplicateJobError({ ...result, status: "duplicate" });
    return result;
  }

  private async importBatch(db: PipelineDb, input: ManualBatchImport) {
    const results: ImportResult[] = [];
    const normalizedUrls = input.jobs.map((job) =>
      normalizeSourceUrl(job.originalUrl),
    );
    const lockOrder = [...new Set(normalizedUrls)].sort();
    for (const normalizedUrl of lockOrder)
      await this.repository.lockNormalizedUrl(db, normalizedUrl);

    for (const [index, job] of input.jobs.entries()) {
      const normalizedUrl = normalizedUrls[index]!;
      const existing = await this.findExistingJob(db, normalizedUrl);
      const status = existing ? "duplicate" : "created";
      const jobId =
        existing?.id ??
        (await this.repository.insertJob(db, job, normalizedUrl));
      const snapshotId = await this.repository.insertSnapshot(
        db,
        jobId,
        normalizedUrl,
        input,
        job,
        sourceSnapshotKey(input, job),
      );
      if (status === "created")
        await this.matching.evaluate(db, jobId, snapshotId, job);
      results.push({ index, status, jobId, normalizedUrl, snapshotId });
    }
    return results;
  }

  private async findExistingJob(db: PipelineDb, normalizedUrl: string) {
    const direct = await this.repository.findJobByNormalizedUrl(
      db,
      normalizedUrl,
    );
    if (direct) return direct;
    const historic = await this.repository.listHistoricJobUrls(db);
    return historic.find((candidate) => this.matches(candidate, normalizedUrl));
  }

  private matches(candidate: { url: string }, normalizedUrl: string) {
    try {
      return normalizeSourceUrl(candidate.url) === normalizedUrl;
    } catch {
      return false;
    }
  }
}
