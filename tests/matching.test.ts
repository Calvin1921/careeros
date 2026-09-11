import test from "node:test";
import assert from "node:assert/strict";
import {
  assessJob,
  containsTerm,
  type Criteria,
} from "../apps/api/src/matching/matching.rules";
import { parseCriteria } from "../apps/api/src/matching/matching.schemas";
const rules: Criteria = {
  roleTerms: ["Engineer"],
  requiredTerms: ["TypeScript"],
  excludeTerms: [],
  location: "hk-or-global",
  salaryFloorHkd: null,
  autoShortlist: false,
};
const job = {
  title: "Senior Engineer",
  description: "Location: Hong Kong",
  requirements: ["TypeScript"],
};
test("literal skill matching escapes punctuation and avoids substring collisions", () => {
  assert.equal(containsTerm("Django developer", "Go"), false);
  for (const term of ["C++", "Node.js", "[test]", "C#", "Go", "a(b)"])
    assert.equal(containsTerm(`Use ${term} daily`, term), true);
  assert.equal(containsTerm("NodeXjs", "Node.js"), false);
});
test("only explicit location evidence qualifies; ambiguous and restricted remote needs review", () => {
  assert.equal(assessJob(job, rules).verdict, "match");
  for (const description of ["Remote: Worldwide", "Remote: Global"])
    assert.equal(assessJob({ ...job, description }, rules).verdict, "match");
  for (const description of [
    "Remote",
    "Our Hong Kong customers",
    "Headquarters Location: Hong Kong",
    "Remote: Worldwide except Asia",
    "Remote: Global\nUS-only",
    "Location: Hong Kong\nMust reside in USA",
  ])
    assert.equal(
      assessJob({ ...job, description }, rules).verdict,
      "review",
      description,
    );
});
test("required bundles, title criteria and exclusions explain failed checks", () => {
  const missing = assessJob(job, {
    ...rules,
    requiredTerms: ["TypeScript", "Go"],
  });
  assert.equal(missing.verdict, "review");
  assert.ok(missing.gaps.some((x) => x.includes("Go")));
  assert.equal(
    assessJob({ ...job, title: "Accountant" }, rules).verdict,
    "review",
  );
  assert.equal(
    assessJob(job, { ...rules, excludeTerms: ["TypeScript"] }).verdict,
    "excluded",
  );
});
test("salary filtering requires explicit currency and interval and never infers an offer", () => {
  const salaryRules = { ...rules, salaryFloorHkd: 70000 };
  for (const [salary, verdict] of [
    ["HKD 70000–90000/month", "match"],
    ["HK$ 80,000 per month", "match"],
    ["HKD 50000-65000/month", "excluded"],
    ["HKD 60000-80000/month", "review"],
    ["USD 80000/month", "review"],
    ["HKD 900000/year", "review"],
    ["HKD 90000-70000/month", "review"],
    ["Negotiable", "review"],
  ])
    assert.equal(
      assessJob(
        { ...job, description: `${job.description}\nSalary: ${salary}` },
        salaryRules,
      ).verdict,
      verdict,
      salary,
    );
  assert.equal(assessJob(job, salaryRules).verdict, "review");
  assert.equal(assessJob(job, rules).verdict, "match");
});
test("criteria reject missing target roles, unknown properties and malformed values", () => {
  assert.deepEqual(parseCriteria({ ...rules, expectedVersion: 0 }), {
    ...rules,
    expectedVersion: 0,
  });
  for (const patch of [
    { roleTerms: [] },
    { roleTerms: [" "] },
    { salaryFloorHkd: -1 },
    { salaryFloorHkd: "70000" },
    { expectedVersion: -1 },
    { autoShortlist: "yes" },
    { location: "remote" },
    { other: true },
  ])
    assert.throws(() =>
      parseCriteria({ ...rules, expectedVersion: 0, ...patch }),
    );
});
