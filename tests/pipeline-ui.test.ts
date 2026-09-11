import test from "node:test";
import assert from "node:assert/strict";
import {
  dueLabel,
  requirementTaskTitle,
  toManualBatchImport,
} from "../apps/web/app/(workspace)/features/pipeline/pipeline.presentation";
import { handledMutation } from "../apps/web/app/(workspace)/features/pipeline/handledMutation";

test("decision labels make overdue and completed work explicit", () => {
  const task = {
    id: "decision",
    title: "Confirm portfolio format",
    due_date: "2026-09-05",
    completed_at: null,
    version: 1,
  };
  assert.equal(dueLabel(task, "2026-09-06"), "Overdue · 2026-09-05");
  assert.equal(
    dueLabel({ ...task, completed_at: "2026-09-05T12:00:00Z" }, "2026-09-06"),
    "Completed",
  );
  assert.equal(requirementTaskTitle("Portfolio URL"), "Prepare: Portfolio URL");
});

test("manual import presentation maps requirement lines to structured records", () => {
  const input = toManualBatchImport(
    [
      {
        originalUrl: "https://example.com/job",
        company: "Example",
        title: "Engineer",
        description: "A complete manually supplied job description.",
        requirements: "Portfolio URL\n\nShort video",
      },
    ],
    new Date("2026-09-06T00:00:00Z"),
  );
  assert.equal(input.extractedAt, "2026-09-06T00:00:00.000Z");
  assert.deepEqual(input.jobs[0]?.requirements, [
    "Portfolio URL",
    "Short video",
  ]);
});

test("handled form mutations contain API rejection and preserve input cleanup for success", async () => {
  let cleaned = false;
  assert.equal(
    await handledMutation(
      () => Promise.reject(new Error("Conflict")),
      () => {
        cleaned = true;
      },
    ),
    false,
  );
  assert.equal(cleaned, false);

  assert.equal(
    await handledMutation(
      () => Promise.resolve("saved"),
      () => {
        cleaned = true;
      },
    ),
    true,
  );
  assert.equal(cleaned, true);
});
