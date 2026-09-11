import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { CareerService } from "../apps/api/src/career/career.service";
import type { CareerRepository } from "../apps/api/src/career/career.repository";
import { PipelineIngestionService } from "../apps/api/src/pipeline/pipeline-ingestion.service";
import type {
  PipelineRepository,
  PipelineDb,
} from "../apps/api/src/pipeline/pipeline.repository";

test("ordinary add-job rejects credential URLs as HTTP 400 before persistence", async () => {
  let writes = 0;
  const repository = {
    inTransaction: async <T>(run: (db: PipelineDb) => Promise<T>) =>
      run({} as PipelineDb),
    lockNormalizedUrl: async () => {
      writes++;
    },
  } as unknown as PipelineRepository;
  const career = new CareerService(
    {} as CareerRepository,
    new PipelineIngestionService(repository, {
      evaluate: async () => ({ evaluated: false, shortlisted: false }),
    } as never),
  );
  await assert.rejects(
    career.create({
      company: "Fixture",
      title: "Engineer",
      url: "https://user:password@example.com/job",
      description: "A sufficiently detailed job description.",
      requirements: [],
    }),
    (error: unknown) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(writes, 0);
});
