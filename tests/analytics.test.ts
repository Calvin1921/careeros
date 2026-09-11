import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOperationalAnalytics,
  isCalendarDate,
  type StageEventRow,
} from "../apps/api/src/intelligence.analytics";

const asOf = new Date("2026-09-10T00:00:00Z");
const event = (
  application: string,
  to: StageEventRow["to_stage"],
  date: string,
  from: StageEventRow["from_stage"] = null,
  kind: StageEventRow["event_kind"] = "transition",
): StageEventRow => ({
  application_id: application,
  from_stage: from,
  to_stage: to,
  created_at: date,
  event_kind: kind,
});

test("empty analytics return explicit zero samples and no fabricated rates", () => {
  const result = buildOperationalAnalytics([], [], { timezone: "UTC", asOf });
  assert.equal(result.cohort.sampleSize, 0);
  assert.ok(result.currentStages.every((value) => value.count === 0));
  assert.ok(result.funnel.every((value) => value.cohortRatePercent === null));
  assert.ok(result.timeInStage.every((value) => value.averageDays === null));
});

test("funnel progression handles skipped stages while durations use recorded stages only", () => {
  const events = [
    event("a", "discovered", "2026-09-01T00:00:00Z"),
    event("a", "applied", "2026-09-03T00:00:00Z", "discovered"),
    event("a", "interview", "2026-09-06T00:00:00Z", "applied"),
    event("a", "rejected", "2026-09-10T00:00:00Z", "interview"),
    event("b", "discovered", "2026-09-01T00:00:00Z"),
    event("b", "shortlisted", "2026-09-02T00:00:00Z", "discovered"),
    event("b", "withdrawn", "2026-09-03T00:00:00Z", "shortlisted"),
  ];
  const result = buildOperationalAnalytics(
    [
      { stage: "rejected", count: 1 },
      { stage: "withdrawn", count: "1" },
    ],
    events,
    { timezone: "UTC", asOf },
  );
  assert.equal(result.cohort.sampleSize, 2);
  assert.equal(
    result.funnel.find((value) => value.stage === "screening")?.reached,
    1,
  );
  assert.equal(
    result.timeInStage.find((value) => value.stage === "screening")?.sampleSize,
    0,
  );
  assert.equal(
    result.timeInStage.find((value) => value.stage === "interview")
      ?.averageDays,
    4,
  );
  assert.deepEqual(result.outcomes, { accepted: 0, rejected: 1, withdrawn: 1 });
  assert.equal(
    result.currentStages.find((value) => value.stage === "rejected")?.count,
    1,
  );
});

test("terminal stages do not accrue ongoing duration; active stages do", () => {
  const result = buildOperationalAnalytics(
    [],
    [
      event("active", "discovered", "2026-09-08T00:00:00Z"),
      event("done", "discovered", "2026-09-01T00:00:00Z"),
      event("done", "accepted", "2026-09-02T00:00:00Z", "offer"),
    ],
    { timezone: "UTC", asOf },
  );
  const discovered = result.timeInStage.find(
    (value) => value.stage === "discovered",
  );
  assert.equal(discovered?.sampleSize, 2);
  assert.equal(discovered?.averageDays, 1.5);
  assert.ok(!result.timeInStage.some((value) => value.stage === "accepted"));
});

test("correction events are reported and excluded from progression samples", () => {
  const result = buildOperationalAnalytics(
    [{ stage: "interview", count: 1 }],
    [
      event("corrected", "discovered", "2026-09-01T00:00:00Z"),
      event(
        "corrected",
        "interview",
        "2026-09-02T00:00:00Z",
        "discovered",
        "correction",
      ),
    ],
    { timezone: "UTC", asOf },
  );
  assert.equal(
    result.currentStages.find((value) => value.stage === "interview")?.count,
    1,
  );
  assert.equal(result.cohort.sampleSize, 0);
  assert.equal(result.cohort.excludedCorrectedApplications, 1);
});

test("corrected applications outside the date range do not inflate exclusions", () => {
  const result = buildOperationalAnalytics(
    [],
    [
      event("outside", "discovered", "2026-08-01T00:00:00Z"),
      event(
        "outside",
        "interview",
        "2026-08-02T00:00:00Z",
        "discovered",
        "correction",
      ),
    ],
    { timezone: "UTC", from: "2026-09-01", to: "2026-09-30", asOf },
  );
  assert.equal(result.cohort.sampleSize, 0);
  assert.equal(result.cohort.excludedCorrectedApplications, 0);
});

test("cohort calendar boundaries use the requested timezone", () => {
  const events = [event("a", "discovered", "2026-09-01T16:30:00Z")];
  const hongKong = buildOperationalAnalytics([], events, {
    timezone: "Asia/Hong_Kong",
    from: "2026-09-02",
    to: "2026-09-02",
    asOf,
  });
  const utc = buildOperationalAnalytics([], events, {
    timezone: "UTC",
    from: "2026-09-02",
    to: "2026-09-02",
    asOf,
  });
  assert.equal(hongKong.cohort.sampleSize, 1);
  assert.equal(utc.cohort.sampleSize, 0);
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2028-02-29"), true);
});
