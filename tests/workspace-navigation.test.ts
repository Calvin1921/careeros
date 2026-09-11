import test from "node:test";
import assert from "node:assert/strict";
import { sectionFromHash } from "../apps/web/app/(workspace)/lib/workspace-section";
test("job deep links select the right redesigned workspace without losing legacy status access", () => {
  const sections = ["materials", "tasks", "description", "history"] as const;
  assert.equal(sectionFromHash("#tasks", sections, "materials"), "tasks");
  assert.equal(sectionFromHash("#history", sections, "materials"), "history");
  assert.equal(sectionFromHash("#status", sections, "materials"), "materials");
});
test("profile claim links retain experience review and invalid fragments use a safe default", () => {
  const sections = [
    "experience",
    "details",
    "capabilities",
    "learning",
    "versions",
  ] as const;
  assert.equal(
    sectionFromHash("#claim-example", sections, "experience"),
    "experience",
  );
  assert.equal(
    sectionFromHash("#learning", sections, "experience"),
    "learning",
  );
  assert.equal(
    sectionFromHash("#unknown", sections, "experience"),
    "experience",
  );
  assert.equal(sectionFromHash("", sections, "experience"), "experience");
});
