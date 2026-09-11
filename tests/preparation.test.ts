import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePreparationUpdate,
  parseRequirementInput,
  parseTaskInput,
} from "../apps/api/src/preparation/preparation.schemas";
import {
  assertPreparationVersion,
  evidenceSignature,
  requirementEntries,
} from "../apps/api/src/preparation/preparation.rules";
import { PreparationConflictError } from "../apps/api/src/preparation/preparation.errors";
import { publicReview } from "../apps/api/src/preparation/preparation.service";
import { PreparationService } from "../apps/api/src/preparation/preparation.service";

const evidenceId = "00000000-0000-4000-8000-000000000001";

test("requirement keys are deterministic and retain source order", () => {
  const first = requirementEntries([" TypeScript ", "PostgreSQL"]);
  const second = requirementEntries([" TypeScript ", "PostgreSQL"]);
  assert.deepEqual(first, second);
  assert.equal(first[0]?.text, "TypeScript");
  assert.match(first[0]?.key ?? "", /^requirement-1-[0-9a-f]{16}$/);
  assert.notEqual(first[0]?.key, first[1]?.key);
});

test("review updates require complete bounded state and valid evidence rules", () => {
  assert.deepEqual(
    parsePreparationUpdate({
      expectedVersion: 0,
      expectedEvidenceSignature: "a".repeat(64),
      status: "direct",
      evidenceId,
      notes: "Production example",
      response: "I would explain the tradeoff.",
      selfRating: "ready",
    }),
    {
      expectedVersion: 0,
      expectedEvidenceSignature: "a".repeat(64),
      status: "direct",
      evidenceId,
      notes: "Production example",
      response: "I would explain the tradeoff.",
      selfRating: "ready",
    },
  );
  assert.throws(
    () =>
      parsePreparationUpdate({
        expectedVersion: 0,
        expectedEvidenceSignature: null,
        status: "gap",
        evidenceId,
        notes: "",
        response: "",
        selfRating: null,
      }),
    /cannot use evidence/,
  );
  assert.throws(
    () =>
      parsePreparationUpdate({
        expectedVersion: 0,
        expectedEvidenceSignature: null,
        status: "unknown",
        evidenceId: null,
        notes: "",
        response: "",
        selfRating: "ready",
      }),
    /requires a practice response/,
  );
  assert.throws(
    () =>
      parsePreparationUpdate({
        expectedVersion: 0,
        expectedEvidenceSignature: null,
        status: "unknown",
        evidenceId: null,
        notes: "x".repeat(3001),
        response: "",
        selfRating: null,
      }),
    /at most 3000/,
  );
  assert.throws(
    () =>
      parsePreparationUpdate({
        expectedVersion: 0,
        expectedEvidenceSignature: null,
        status: "direct",
        evidenceId,
        notes: "",
        response: "",
        selfRating: null,
      }),
    /require an evidence signature/,
  );
  assert.throws(
    () =>
      parsePreparationUpdate({
        expectedVersion: 0,
        expectedEvidenceSignature: "a".repeat(64),
        status: "unknown",
        evidenceId: null,
        notes: "",
        response: "",
        selfRating: null,
      }),
    /require null/,
  );
});

test("dates are real and requirement excerpts are bounded", () => {
  assert.deepEqual(parseTaskInput({ dueDate: "2026-09-30" }), {
    dueDate: "2026-09-30",
  });
  assert.throws(
    () => parseTaskInput({ dueDate: "2026-09-31" }),
    /real calendar date/,
  );
  assert.deepEqual(parseRequirementInput({ text: "  TypeScript  " }), {
    text: "TypeScript",
  });
  assert.throws(
    () => parseRequirementInput({ text: "x".repeat(501) }),
    /at most 500/,
  );
});

test("optimistic versions include zero for a new review", () => {
  assert.doesNotThrow(() => assertPreparationVersion(undefined, 0));
  assert.doesNotThrow(() => assertPreparationVersion(3, 3));
  assert.throws(() => assertPreparationVersion(3, 2), PreparationConflictError);
});

test("current evidence kind is exposed without upgrading project evidence", () => {
  const evidence = {
    id: evidenceId,
    capability_id: "capability-1",
    capability_name: "Systems design",
    kind: "project" as const,
    summary: "Built a synthetic queue worker",
    source_url: "https://example.com/project",
    source_label: "Project notes",
    verified: true,
    attested_at: "2026-09-07T00:00:00Z",
  };
  const review = {
    job_id: "job-1",
    requirement_key: "requirement-1-aaaaaaaaaaaaaaaa",
    requirement_text: "Systems design",
    status: "direct" as const,
    evidence_id: evidence.id,
    evidence_signature: evidenceSignature(evidence),
    notes: "",
    response: "A practiced response",
    self_rating: "ready" as const,
    version: 1,
    created_at: "2026-09-07T00:00:00Z",
    updated_at: "2026-09-07T00:00:00Z",
  };
  assert.equal(
    publicReview(review, new Map([[evidence.id, evidence]])).evidenceKind,
    "project",
  );
});

test("changed and re-attested evidence invalidates the earlier support snapshot", () => {
  const original = {
    id: evidenceId,
    capability_id: "capability-1",
    capability_name: "Systems design",
    kind: "project" as const,
    summary: "Original attested claim",
    source_url: "https://example.com/project",
    source_label: "Project notes",
    verified: true,
    attested_at: "2026-09-07T00:00:00Z",
  };
  const changed = {
    ...original,
    kind: "production" as const,
    summary: "A different re-attested claim",
    attested_at: "2026-09-08T00:00:00Z",
  };
  const review = {
    job_id: "job-1",
    requirement_key: "requirement-1-aaaaaaaaaaaaaaaa",
    requirement_text: "Systems design",
    status: "direct" as const,
    evidence_id: evidenceId,
    evidence_signature: evidenceSignature(original),
    notes: "Keep practice notes",
    response: "Keep my drafted answer",
    self_rating: "ready" as const,
    version: 2,
    created_at: "2026-09-07T00:00:00Z",
    updated_at: "2026-09-07T00:00:00Z",
  };
  const result = publicReview(review, new Map([[evidenceId, changed]]));
  assert.equal(result.status, "unknown");
  assert.equal(result.evidenceId, null);
  assert.equal(result.evidenceKind, null);
  assert.match(result.invalidatedReason ?? "", /changed/);
  assert.equal(result.response, "Keep my drafted answer");
});

test("moving evidence to another capability changes its review signature", () => {
  const evidence = {
    id: evidenceId,
    capability_id: "capability-1",
    kind: "project",
    summary: "Same claim",
    source_url: "https://example.com/project",
    source_label: "Project notes",
  };
  assert.notEqual(
    evidenceSignature(evidence),
    evidenceSignature({ ...evidence, capability_id: "capability-2" }),
  );
});

test("a stale editor cannot silently re-sign changed evidence", async () => {
  const requirements = ["TypeScript"];
  const key = requirementEntries(requirements)[0]!.key;
  let writes = 0;
  const currentEvidence = {
    id: evidenceId,
    capability_id: "capability-1",
    capability_name: "Engineering",
    kind: "production" as const,
    summary: "Changed and re-attested claim",
    source_url: "https://example.com/evidence",
    source_label: "Work record",
    verified: true,
    attested_at: "2026-09-08T00:00:00Z",
  };
  const repository = {
    inTransaction: async <T>(run: (db: object) => Promise<T>) => run({}),
    lockKey: async () => undefined,
    getJob: async () => ({
      id: "job-1",
      description: "TypeScript",
      requirements,
    }),
    findReviewForUpdate: async () => undefined,
    findAttestedEvidence: async () => currentEvidence,
    insertReview: async () => {
      writes += 1;
      throw new Error("must not write");
    },
  };
  const service = new PreparationService(repository as never);
  await assert.rejects(
    service.update("job-1", key, {
      expectedVersion: 0,
      expectedEvidenceSignature: "0".repeat(64),
      status: "direct",
      evidenceId,
      notes: "",
      response: "Practiced answer",
      selfRating: "ready",
    }),
    /evidence changed/i,
  );
  assert.equal(writes, 0);
});

test("source-backed requirement capture appends once and preserves current order", async () => {
  let requirements = ["First requirement"];
  const repository = {
    inTransaction: async <T>(run: (db: object) => Promise<T>) => run({}),
    getJobForUpdate: async () => ({
      id: "job-1",
      description: "First requirement\nNew exact requirement",
      requirements,
    }),
    appendRequirement: async (_db: object, _jobId: string, next: string[]) => {
      requirements = next;
    },
  };
  const service = new PreparationService(repository as never);
  const created = await service.addRequirement(
    "job-1",
    "New exact requirement",
  );
  assert.equal(created.reused, false);
  assert.deepEqual(requirements, [
    "First requirement",
    "New exact requirement",
  ]);

  const repeated = await service.addRequirement(
    "job-1",
    "New exact requirement",
  );
  assert.equal(repeated.reused, true);
  assert.deepEqual(requirements, [
    "First requirement",
    "New exact requirement",
  ]);
});

test("requirement capture rejects text that is not in the saved description", async () => {
  const repository = {
    inTransaction: async <T>(run: (db: object) => Promise<T>) => run({}),
    getJobForUpdate: async () => ({
      id: "job-1",
      description: "Actual source text",
      requirements: [],
    }),
  };
  const service = new PreparationService(repository as never);
  await assert.rejects(
    service.addRequirement("job-1", "Invented requirement"),
    /exact excerpt/,
  );
});

test("task creation returns a linked existing decision on duplicate date", async () => {
  let creates = 0;
  const requirements = ["TypeScript"];
  const key = requirementEntries(requirements)[0]!.key;
  const repository = {
    inTransaction: async <T>(run: (db: object) => Promise<T>) => run({}),
    lockKey: async () => undefined,
    getJob: async () => ({
      id: "job-1",
      description: "TypeScript",
      requirements,
    }),
    findTask: async () => ({
      requirement_key: key,
      id: "decision-1",
      title: "Prepare: TypeScript",
      due_date: "2026-09-30",
      completed_at: null,
      version: 1,
      created_at: "2026-09-07T00:00:00Z",
      updated_at: "2026-09-07T00:00:00Z",
    }),
    createTask: async () => {
      creates += 1;
      throw new Error("must not create");
    },
  };
  const service = new PreparationService(repository as never);
  const result = await service.createTask("job-1", key, "2026-09-30");
  assert.equal(result.reused, true);
  assert.equal(result.decision.id, "decision-1");
  assert.equal(creates, 0);
});
