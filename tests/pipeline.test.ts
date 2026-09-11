import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCorrectionCurrentStage,
  assertDecisionVersion,
  normalizeSourceUrl,
  sourceSnapshotKey,
} from "../apps/api/src/pipeline/pipeline.rules";
import {
  manualBatchImportSchema,
  stageCorrectionSchema,
  updateDecisionSchema,
} from "../apps/api/src/pipeline/pipeline.schemas";
import {
  PipelineConflictError,
  PipelineValidationError,
} from "../apps/api/src/pipeline/pipeline.errors";
import { manualFormImport } from "../apps/api/src/pipeline/manual-source.adapter";
import { PipelineIngestionService } from "../apps/api/src/pipeline/pipeline-ingestion.service";

test("source URLs normalize cosmetic differences without removing semantic parameters", () => {
  assert.equal(
    normalizeSourceUrl(
      "HTTPS://Example.COM:443/jobs/42/?utm_source=newsletter&b=2&a=1#apply",
    ),
    "https://example.com/jobs/42?a=1&b=2",
  );
  assert.equal(
    normalizeSourceUrl("https://example.com/jobs?location=hk&ref=internal"),
    "https://example.com/jobs?location=hk&ref=internal",
  );
});

test("source URLs reject executable schemes and embedded credentials", () => {
  assert.throws(
    () => normalizeSourceUrl("javascript:alert(1)"),
    PipelineValidationError,
  );
  assert.throws(
    () => normalizeSourceUrl("https://user:secret@example.com/jobs/1"),
    PipelineValidationError,
  );
});

test("manual adapter accepts a bounded structured snapshot and rejects scraper adapters", () => {
  const parsed = manualBatchImportSchema.parse({
    adapter: "manual-structured",
    extractedAt: "2026-09-06T02:03:04+08:00",
    extractionVersion: "clipboard-v1",
    jobs: [
      {
        originalUrl: "https://example.com/jobs/1",
        company: "Example",
        title: "Engineer",
        description: "A complete manually supplied job description.",
        requirements: ["TypeScript"],
      },
    ],
  });
  assert.equal(parsed.extractedAt, "2026-09-05T18:03:04.000Z");
  assert.equal(parsed.jobs[0]?.requirements[0], "TypeScript");
  assert.throws(
    () =>
      manualBatchImportSchema.parse({ ...parsed, adapter: "remote-scraper" }),
    /does not fetch job pages/,
  );
});

test("identical source observations have a stable snapshot key", () => {
  const input = manualBatchImportSchema.parse({
    adapter: "manual-structured",
    extractedAt: "2026-09-06T00:00:00Z",
    extractionVersion: "manual-v1",
    jobs: [
      {
        originalUrl: "https://example.com/role",
        company: "Example",
        title: "Engineer",
        description: "A complete manually supplied job description.",
        requirements: [],
      },
    ],
  });
  assert.equal(
    sourceSnapshotKey(input, input.jobs[0]!),
    sourceSnapshotKey(input, input.jobs[0]!),
  );
  assert.equal(
    sourceSnapshotKey(input, input.jobs[0]!),
    sourceSnapshotKey(
      {
        adapter: input.adapter,
        extractedAt: input.extractedAt,
        extractionVersion: input.extractionVersion,
      },
      input.jobs[0]!,
    ),
    "snapshot identity does not depend on other records in its batch",
  );
});

test("ordinary add-job input is adapted to the same provenance contract", () => {
  const input = manualFormImport(
    {
      url: "https://example.com/jobs/1",
      company: "Example",
      title: "Engineer",
      description: "A complete manually supplied job description.",
      requirements: ["TypeScript"],
    },
    "2026-09-06T00:00:00.000Z",
  );
  assert.equal(input.adapter, "manual-structured");
  assert.equal(input.extractionVersion, "manual-form-v1");
  assert.equal(input.jobs[0]?.originalUrl, "https://example.com/jobs/1");
});

test("repeating and reversing a batch locks canonically and creates one job per URL", async () => {
  const jobs = new Map<string, string>();
  const snapshots = new Map<string, string>();
  const lockOrders: string[][] = [];
  const repository = {
    async inTransaction<T>(run: (db: { locks: string[] }) => Promise<T>) {
      const db = { locks: [] as string[] };
      lockOrders.push(db.locks);
      return run(db);
    },
    async lockNormalizedUrl(db: { locks: string[] }, url: string) {
      db.locks.push(url);
    },
    async findJobByNormalizedUrl(_db: unknown, url: string) {
      const id = jobs.get(url);
      return id ? { id } : undefined;
    },
    async listHistoricJobUrls() {
      return [];
    },
    async insertJob(_db: unknown, _job: unknown, url: string) {
      const id = `job-${jobs.size + 1}`;
      jobs.set(url, id);
      return id;
    },
    async insertSnapshot(
      _db: unknown,
      _jobId: string,
      _url: string,
      _input: unknown,
      _job: unknown,
      key: string,
    ) {
      const id = snapshots.get(key) ?? `snapshot-${snapshots.size + 1}`;
      snapshots.set(key, id);
      return id;
    },
  };
  const service = new PipelineIngestionService(
    repository as never,
    {
      evaluate: async () => ({ evaluated: false, shortlisted: false }),
    } as never,
  );
  const input = manualBatchImportSchema.parse({
    adapter: "manual-structured",
    extractedAt: "2026-09-06T00:00:00Z",
    extractionVersion: "manual-v1",
    jobs: [
      {
        originalUrl: "https://example.com/jobs/b?utm_source=mail",
        company: "Example",
        title: "Engineer B",
        description: "A complete manually supplied job description.",
        requirements: [],
      },
      {
        originalUrl: "https://example.com/jobs/a",
        company: "Example",
        title: "Engineer A",
        description: "Another complete manually supplied job description.",
        requirements: [],
      },
    ],
  });

  const first = await service.importStructuredJobs(input);
  const second = await service.importStructuredJobs({
    ...input,
    jobs: [...input.jobs].reverse(),
  });
  assert.equal(first[0]?.status, "created");
  assert.equal(second[0]?.status, "duplicate");
  assert.equal(jobs.size, 2);
  assert.equal(snapshots.size, 2);
  assert.deepEqual(lockOrders[0], [...lockOrders[0]!].sort());
  assert.deepEqual(lockOrders[1], lockOrders[0]);
});

test("stage correction requires a reason, changes stage and detects stale concurrent commands", () => {
  assert.throws(
    () =>
      stageCorrectionSchema.parse({
        fromStage: "applied",
        toStage: "applied",
        reason: "duplicate",
      }),
    /must change/,
  );
  const correction = stageCorrectionSchema.parse({
    fromStage: "interview",
    toStage: "screening",
    reason: "The screening date arrived after the interview was logged.",
  });
  assert.throws(
    () => assertCorrectionCurrentStage("offer", correction),
    PipelineConflictError,
  );
  assert.doesNotThrow(() =>
    assertCorrectionCurrentStage("interview", correction),
  );
});

test("decision updates validate dates and use optimistic versions", () => {
  assert.deepEqual(
    updateDecisionSchema.parse({
      expectedVersion: 2,
      dueDate: "2026-09-30",
      completed: true,
    }),
    { expectedVersion: 2, dueDate: "2026-09-30", completed: true },
  );
  assert.throws(
    () =>
      updateDecisionSchema.parse({ expectedVersion: 2, dueDate: "2026-02-30" }),
    /real calendar date/,
  );
  assert.throws(() => assertDecisionVersion(3, 2), PipelineConflictError);
});
