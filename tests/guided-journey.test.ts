import test from "node:test";
import assert from "node:assert/strict";
import { stages, type JobRecord } from "../packages/domain/src/index";
import {
  jobGuide,
  interviewPreparationAvailable,
  dailyIntake,
} from "../apps/web/app/(workspace)/lib/career-journey";
import { nextTodayAction } from "../apps/web/app/(workspace)/features/today/today-journey";
import {
  statusSegments,
  donutGradient,
} from "../apps/web/app/(workspace)/features/intelligence/status-summary";
import {
  isInitialProfile,
  isApplicationProfileReady,
} from "../apps/web/app/(workspace)/lib/profile-state";
import type { Overview } from "../apps/web/app/hooks/use-workspace";
const job = (stage: JobRecord["stage"], id = stage): JobRecord => ({
  id,
  stage,
  title: "Engineer",
  company: "Synthetic Company",
  url: "https://example.com",
  description: "Synthetic test role only",
  requirements: [],
  created_at: new Date(2026, 8, 5, 9).toISOString(),
});
const overview: Overview = {
  today: "2026-09-06",
  decisions: [],
  missingMaterials: [],
  pendingClaims: [],
  counts: { total: 0, active: 0 },
};
test("each stage gets a relevant next step, with interview prep only after an invitation", () => {
  assert.equal(jobGuide("discovered").section, "description");
  assert.equal(jobGuide("shortlisted").section, "materials");
  assert.equal(jobGuide("applied").section, "tasks");
  for (const stage of stages)
    assert.equal(
      interviewPreparationAvailable(stage),
      stage === "screening" || stage === "interview",
    );
  assert.equal(jobGuide("offer").section, "tasks");
  assert.equal(jobGuide("accepted").tone, "complete");
});
test("Today prioritizes dated work before conversations and profile setup", () => {
  const due = {
    ...overview,
    decisions: [
      {
        id: "due",
        job_id: "role",
        title: "Follow up",
        due_date: "2026-09-05",
        company: "Synthetic",
        role_title: "Engineer",
      },
    ],
  };
  assert.equal(
    nextTodayAction([job("interview")], due, false).href,
    "/jobs/role#tasks",
  );
  assert.equal(
    nextTodayAction([job("interview")], overview, false).href,
    "/jobs/interview#materials",
  );
  assert.equal(
    nextTodayAction([job("shortlisted")], overview, false).href,
    "/profile",
  );
});
test("earlier shortlisted roles stay in the apply queue ahead of new discoveries", () => {
  const action = nextTodayAction(
    [job("discovered"), job("shortlisted")],
    overview,
    true,
  );
  assert.equal(action.href, "/jobs/shortlisted#materials");
  assert.equal(
    nextTodayAction([job("applied")], overview, true).href,
    "/jobs#applied",
  );
});
test("daily intake counts saved jobs by local date and exact time boundaries", () => {
  const at = (day: number, hour: number, minute = 0) => ({
    ...job("discovered"),
    created_at: new Date(2026, 8, day, hour, minute).toISOString(),
  });
  const groups = dailyIntake(
    [
      at(6, 11, 59),
      at(6, 12),
      at(6, 17, 59),
      at(6, 18),
      at(5, 23),
      { ...job("discovered"), created_at: "invalid" },
    ],
    "2026-09-06",
  );
  assert.deepEqual(
    groups.map((x) => x.jobs.length),
    [1, 2, 1],
  );
});
test("profile empty state offers onboarding until a source or manual experience exists", () => {
  const value = { imports: [], experiences: [], profile: null };
  assert.equal(isInitialProfile(value), true);
  assert.equal(isApplicationProfileReady(value), false);
  assert.equal(
    isInitialProfile({ ...value, experiences: [{ status: "proposed" }] }),
    false,
  );
  assert.equal(isInitialProfile({ ...value, imports: [{}] }), false);
  assert.equal(
    isApplicationProfileReady({
      ...value,
      profile: { full_name: "Fixture" },
      experiences: [{ status: "proposed" }],
    }),
    false,
  );
  assert.equal(
    isApplicationProfileReady({
      ...value,
      profile: { full_name: "Fixture" },
      experiences: [{ status: "confirmed" }],
    }),
    true,
  );
});
test("status visualization conserves all application counts and has a valid empty representation", () => {
  const segments = statusSegments(stages.map((stage) => ({ stage, count: 1 })));
  assert.equal(
    segments.reduce((sum, x) => sum + x.count, 0),
    9,
  );
  assert.equal(segments.find((x) => x.label === "In conversation")?.count, 3);
  assert.equal(donutGradient(statusSegments([])), "#edf1f7");
  assert.ok(!donutGradient(segments).includes("NaN"));
});
