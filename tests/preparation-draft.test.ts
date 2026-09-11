import test from "node:test";
import assert from "node:assert/strict";
import {
  clearPreparationDraft,
  createPreparationDraft,
  readPreparationDraft,
  readSelectedRequirement,
  recoverPreparationRequirement,
  writePreparationDraft,
  writeSelectedRequirement,
  type DraftStorage,
} from "../apps/web/app/(workspace)/features/preparation/preparation-draft";
import type { PreparationRequirement } from "../apps/web/app/(workspace)/features/preparation/types";

const jobId = "00000000-0000-4000-8000-000000000001";
const requirementKey = "requirement-1-0123456789abcdef";
const evidenceId = "00000000-0000-4000-8000-000000000002";
const capabilityId = "00000000-0000-4000-8000-000000000003";

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: DraftStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
  return { storage, values };
}

function requirement(): PreparationRequirement {
  return {
    key: requirementKey,
    text: "Design reliable distributed systems",
    review: {
      status: "direct",
      evidenceId,
      evidenceKind: "project",
      notes: "Original saved reasoning",
      response: "Original saved response",
      selfRating: "needs-work",
      version: 7,
      invalidatedReason: null,
    },
    evidenceOptions: [
      {
        id: evidenceId,
        capabilityId,
        capabilityName: "Systems design",
        kind: "project",
        summary: "Built a queue worker",
        sourceLabel: "Project notes",
        sourceUrl: "https://example.com/project",
        signature: "a".repeat(64),
      },
    ],
    tasks: [],
  };
}

test("draft recovery retains the original version and evidence signature", () => {
  const { storage } = memoryStorage();
  const original = requirement();
  const draft = createPreparationDraft(jobId, original, {
    status: "direct",
    evidenceId,
    notes: "Unsaved reasoning",
    response: "Unsaved practice answer",
    selfRating: "ready",
  });
  assert.equal(writePreparationDraft(storage, draft), true);

  const recovered = readPreparationDraft(storage, jobId, requirementKey);
  assert.ok(recovered);
  assert.equal(recovered.originalReview.version, 7);
  assert.equal(recovered.evidenceSnapshot?.signature, "a".repeat(64));
  assert.equal(recovered.fields.response, "Unsaved practice answer");

  const current = requirement();
  current.review.version = 8;
  current.evidenceOptions[0] = {
    ...current.evidenceOptions[0]!,
    summary: "Changed claim",
    signature: "b".repeat(64),
  };
  const opened = recoverPreparationRequirement(current, recovered);
  assert.equal(opened.review.version, 7);
  assert.equal(opened.evidenceOptions[0]?.signature, "a".repeat(64));
  assert.equal(opened.tasks, current.tasks);
});

test("corrupt and over-limit drafts are ignored and removed", () => {
  const { storage, values } = memoryStorage();
  const draft = createPreparationDraft(jobId, requirement(), {
    status: "direct",
    evidenceId,
    notes: "Unsaved reasoning",
    response: "Unsaved answer",
    selfRating: null,
  });
  assert.equal(writePreparationDraft(storage, draft), true);
  const [key] = values.keys();
  assert.ok(key);

  values.set(key, "not json");
  assert.equal(readPreparationDraft(storage, jobId, requirementKey), null);
  assert.equal(values.has(key), false);

  values.set(
    key,
    JSON.stringify({
      ...draft,
      fields: { ...draft.fields, response: "x".repeat(10001) },
    }),
  );
  assert.equal(readPreparationDraft(storage, jobId, requirementKey), null);
  assert.equal(values.has(key), false);
});

test("successful save or explicit discard can clear only the selected draft", () => {
  const { storage } = memoryStorage();
  const first = createPreparationDraft(jobId, requirement(), {
    status: "gap",
    evidenceId: "",
    notes: "Practice this",
    response: "",
    selfRating: null,
  });
  const secondRequirement = {
    ...requirement(),
    key: "requirement-2-fedcba9876543210",
  };
  const second = createPreparationDraft(jobId, secondRequirement, {
    status: "gap",
    evidenceId: "",
    notes: "Keep this draft",
    response: "",
    selfRating: null,
  });
  writePreparationDraft(storage, first);
  writePreparationDraft(storage, second);

  clearPreparationDraft(storage, jobId, first.requirementKey);
  assert.equal(
    readPreparationDraft(storage, jobId, first.requirementKey),
    null,
  );
  assert.equal(
    readPreparationDraft(storage, jobId, second.requirementKey)?.fields.notes,
    "Keep this draft",
  );
});

test("selected requirement memory is job-scoped and storage failures are harmless", () => {
  const { storage } = memoryStorage();
  writeSelectedRequirement(storage, jobId, requirementKey);
  assert.equal(readSelectedRequirement(storage, jobId), requirementKey);
  assert.equal(
    readSelectedRequirement(storage, "00000000-0000-4000-8000-000000000099"),
    null,
  );

  const unavailable: DraftStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readPreparationDraft(unavailable, jobId, requirementKey), null);
  assert.equal(
    writePreparationDraft(
      unavailable,
      createPreparationDraft(jobId, requirement(), {
        status: "gap",
        evidenceId: "",
        notes: "Draft still stays in React state",
        response: "",
        selfRating: null,
      }),
    ),
    false,
  );
  assert.doesNotThrow(() =>
    clearPreparationDraft(unavailable, jobId, requirementKey),
  );
});
