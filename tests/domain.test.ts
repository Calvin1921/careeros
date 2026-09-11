import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, claimLevel, newJob } from "../packages/domain/src";
test("pipeline blocks impossible jumps and terminal reopen", () => {
  assert.equal(canTransition("discovered", "accepted"), false);
  assert.equal(canTransition("applied", "screening"), true);
  assert.equal(canTransition("accepted", "interview"), false);
  assert.equal(canTransition("applied", "applied"), true);
});
test("unverified evidence never justifies production claims", () => {
  assert.equal(
    claimLevel([
      { kind: "production", verified: false },
      { kind: "project", verified: true },
    ]),
    "demonstrated in a project",
  );
  assert.equal(claimLevel([]), "not yet evidenced");
});
test("job source rejects script URLs", () => {
  assert.equal(
    newJob.safeParse({
      company: "A",
      title: "B",
      url: "javascript:alert(1)",
      description: "Long enough job description",
    }).success,
    false,
  );
});
