import assert from "node:assert/strict";
import { createRequire } from "node:module";
const url = new URL(process.env.DATABASE_URL ?? "postgres://invalid/invalid");
if (
  url.pathname !== "/careeros_matching_test" ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.port !== "54330"
)
  throw new Error(
    "This check requires the disposable careeros_matching_test database on preview port 54330.",
  );
const require = createRequire(import.meta.url);
const { pool } = require("../packages/data/dist/index.js");
const {
  MatchingRepository,
} = require("../apps/api/dist/matching/matching.repository.js");
const {
  MatchingService,
} = require("../apps/api/dist/matching/matching.service.js");
const {
  PipelineRepository,
} = require("../apps/api/dist/pipeline/pipeline.repository.js");
const {
  PipelineIngestionService,
} = require("../apps/api/dist/pipeline/pipeline-ingestion.service.js");
const matcher = new MatchingService(new MatchingRepository());
const ingestion = new PipelineIngestionService(
  new PipelineRepository(),
  matcher,
);
const rules = {
  roleTerms: ["Engineer"],
  requiredTerms: ["TypeScript"],
  excludeTerms: [],
  location: "hk-or-global",
  salaryFloorHkd: null,
  autoShortlist: true,
};
const job = {
  company: "Synthetic Matching Check",
  title: "Engineer",
  originalUrl: "https://example.com/match",
  description: "Location: Hong Kong",
  requirements: ["TypeScript"],
};
const batch = (jobs, date = "2026-09-06T01:00:00.000Z") => ({
  adapter: "manual-structured",
  extractionVersion: "matching-test",
  extractedAt: date,
  jobs,
});
try {
  assert.deepEqual(await matcher.criteria(), { version: 0, rules: null });
  const v1 = await matcher.save({ ...rules, expectedVersion: 0 });
  await assert.rejects(
    matcher.save({ ...rules, expectedVersion: 0 }),
    (e) => e.getStatus() === 409,
  );
  const [matched, uncertain, changed, applied] =
    await ingestion.importStructuredJobs(
      batch([
        job,
        {
          ...job,
          originalUrl: "https://example.com/uncertain",
          description: "Remote",
        },
        {
          ...job,
          originalUrl: "https://example.com/changed",
          description: "Unknown location",
        },
        {
          ...job,
          originalUrl: "https://example.com/applied",
          description: "Unknown location",
        },
      ]),
    );
  const stage = async (id) =>
    (await pool.query("SELECT stage FROM applications WHERE job_id=$1", [id]))
      .rows[0].stage;
  assert.equal(await stage(matched.jobId), "shortlisted");
  assert.equal(await stage(uncertain.jobId), "discovered");
  await pool.query("UPDATE applications SET stage='applied' WHERE job_id=$1", [
    applied.jobId,
  ]);
  await ingestion.importStructuredJobs(
    batch(
      [{ ...job, originalUrl: "https://example.com/changed" }],
      "2026-09-06T02:00:00.000Z",
    ),
  );
  // Processing must assess the newer source payload, not stale canonical text.
  const processed = await matcher.process();
  assert.equal(processed.shortlisted, 1);
  assert.equal(await stage(changed.jobId), "shortlisted");
  assert.equal(await stage(applied.jobId), "applied");
  assert.equal((await matcher.process()).shortlisted, 0);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM stage_events WHERE to_stage='shortlisted'",
      )
    ).rows[0].n,
    2,
  );
  const history = await matcher.history();
  assert.equal(history.length, 5);
  const latest = history.find(
    (x) => x.job_id === changed.jobId && x.verdict === "match",
  );
  assert.equal(latest.criteria_version, v1.version);
  const results = await matcher.results();
  assert.ok(results.find((x) => x.job_id === uncertain.jobId).gaps.length);
  const v2 = await matcher.save({
    ...rules,
    autoShortlist: false,
    expectedVersion: v1.version,
  });
  const [disabled] = await ingestion.importStructuredJobs(
    batch([{ ...job, originalUrl: "https://example.com/disabled" }]),
  );
  assert.equal(await stage(disabled.jobId), "discovered");
  assert.equal(
    (await matcher.results()).find((x) => x.job_id === disabled.jobId)
      .criteria_version,
    v2.version,
  );
  console.log(
    "Matching database checks passed: version conflicts, auto-shortlist, review gaps, latest-source provenance, stage preservation, replay, history, opt-out.",
  );
} finally {
  await pool.end();
}
