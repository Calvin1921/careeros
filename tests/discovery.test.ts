import test from "node:test";
import assert from "node:assert/strict";
import {
  cvSignals,
  scheduledSlot,
  assessSource,
  type SourceJob,
} from "../apps/api/src/discovery/discovery.rules";
import { parseSettings } from "../apps/api/src/discovery/discovery.schemas";
import { sourceJobs } from "../apps/api/src/discovery/greenhouse.source";
const job: SourceJob = {
  id: "1",
  company: "Example",
  title: "Frontend engineer",
  url: "https://example.com/jobs/1",
  description: "Build TypeScript services and React applications.",
  location: "Hong Kong",
  salary: "",
  updatedAt: null,
};
const rules = {
  roleTerms: ["frontend"],
  requiredTerms: [],
  excludeTerms: [],
  location: "hk-or-global" as const,
  salaryFloorHkd: null,
  autoShortlist: true,
};
test("CV signals extract literal skills and role families without inferring preferences", () => {
  const result = cvSignals(
    "Senior Frontend Engineer. TypeScript, React Native, PostgreSQL. Django.",
  );
  assert.ok(result.roleTerms.includes("frontend"));
  assert.ok(result.skills.includes("TypeScript"));
  assert.ok(result.skills.includes("React Native"));
  assert.ok(!result.skills.includes("Go"));
  assert.deepEqual(cvSignals("Demo Candidate\nHong Kong\ncontact@example.com"), {
    skills: [],
    roleTerms: [],
  });
});
test("source matching requires title, CV overlap and explicit source eligibility", () => {
  assert.equal(assessSource(job, rules, ["TypeScript"]).verdict, "match");
  assert.equal(
    assessSource({ ...job, location: "Remote" }, rules, ["TypeScript"]).verdict,
    "review",
  );
  assert.equal(
    assessSource({ ...job, location: "Remote - Worldwide" }, rules, [
      "TypeScript",
    ]).verdict,
    "match",
  );
  assert.equal(
    assessSource(
      {
        ...job,
        location: "US",
        description: job.description + "\nLocation: Hong Kong",
      },
      rules,
      ["TypeScript"],
    ).verdict,
    "review",
  );
  assert.equal(assessSource(job, rules, ["Kotlin"]).verdict, "review");
  assert.equal(
    assessSource({ ...job, title: "Sales manager" }, rules, ["TypeScript"])
      .verdict,
    "excluded",
  );
  assert.equal(
    assessSource(job, { ...rules, salaryFloorHkd: 70000 }, ["TypeScript"])
      .verdict,
    "review",
  );
});
test("Hong Kong schedules run only after enabling and coalesce missed slots", () => {
  const enabled = new Date("2026-09-06T00:30:00Z");
  assert.equal(
    scheduledSlot(
      new Date("2026-09-06T00:59:00Z"),
      ["09:00", "14:00", "19:00"],
      enabled,
    ),
    null,
  );
  assert.equal(
    scheduledSlot(
      new Date("2026-09-06T01:00:00Z"),
      ["09:00", "14:00", "19:00"],
      enabled,
    ),
    "2026-09-06T09:00+08:00",
  );
  assert.equal(
    scheduledSlot(
      new Date("2026-09-06T12:00:00Z"),
      ["09:00", "14:00", "19:00"],
      enabled,
    ),
    "2026-09-06T19:00+08:00",
  );
  assert.equal(
    scheduledSlot(new Date("2026-09-06T12:00:00Z"), [], enabled),
    null,
  );
  assert.equal(
    scheduledSlot(
      new Date("2026-09-06T12:00:00Z"),
      ["09:00"],
      new Date("2026-09-06T11:00:00Z"),
    ),
    null,
  );
});
test("settings reject arbitrary fetch URLs and invalid schedule times", () => {
  assert.deepEqual(
    parseSettings({
      sources: ["stripe", "stripe"],
      scheduleTimes: ["19:00", "09:00"],
    }),
    { sources: ["stripe"], scheduleTimes: ["09:00", "19:00"] },
  );
  for (const sources of [[], ["https://localhost"], ["../internal"]])
    assert.throws(() => parseSettings({ sources, scheduleTimes: [] }));
  assert.throws(() =>
    parseSettings({ sources: ["stripe"], scheduleTimes: ["25:00"] }),
  );
});
test("career board adapter parses text without rendering source HTML and rejects incomplete feeds", () => {
  const payload = {
    jobs: [
      {
        id: 1,
        internal_job_id: 5,
        title: "Engineer",
        absolute_url: "https://example.com/1",
        location: { name: "Hong Kong" },
        content: "<p>Build <strong>TypeScript</strong> applications.</p>",
      },
    ],
  };
  const parsed = sourceJobs(payload, "Example");
  assert.ok(parsed[0].description.includes("TypeScript"));
  assert.ok(!parsed[0].description.includes("<strong>"));
  assert.throws(() => sourceJobs({ jobs: [{}] }, "Example"));
  assert.throws(() => sourceJobs({ error: "unavailable" }, "Example"));
  assert.throws(() =>
    sourceJobs(
      {
        jobs: [
          {
            ...payload.jobs[0],
            absolute_url: "http://secret:password@example.com",
          },
        ],
      },
      "Example",
    ),
  );
});
