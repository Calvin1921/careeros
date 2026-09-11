import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const target = new URL(
  process.env.DATABASE_URL ?? "postgres://invalid/invalid",
);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "54330" ||
  target.pathname !== "/careeros_discovery_test"
)
  throw new Error(
    "Requires disposable careeros_discovery_test on preview PostgreSQL port 54330.",
  );
const { pool } = require("../packages/data/dist/index.js");
const {
  DiscoveryRepository,
} = require("../apps/api/dist/discovery/discovery.repository.js");
const {
  DiscoveryService,
} = require("../apps/api/dist/discovery/discovery.service.js");
const {
  DiscoveryRunner,
} = require("../apps/api/dist/discovery/discovery.runner.js");
const {
  MatchingRepository,
} = require("../apps/api/dist/matching/matching.repository.js");
const {
  PipelineRepository,
} = require("../apps/api/dist/pipeline/pipeline.repository.js");
const {
  ProfileRecordsService,
} = require("../apps/api/dist/profile-records.service.js");
const repo = new DiscoveryRepository(),
  matching = new MatchingRepository(),
  service = new DiscoveryService(repo, matching),
  runner = new DiscoveryRunner(repo, new PipelineRepository(), matching);
const job = {
  id: "1",
  title: "Software Engineer",
  company: "Synthetic Scan Company",
  url: "https://example.com/discovery-fixture",
  description:
    "Build TypeScript and React applications with the engineering team.",
  location: "Hong Kong",
  salary: "",
  updatedAt: null,
};
const source = async (token) => {
  if (token === "broken") throw new Error("Fixture source unavailable");
  return {
    jobs: [
      job,
      {
        ...job,
        id: "2",
        url: "https://example.com/uncertain",
        location: "Remote",
      },
      {
        ...job,
        id: "3",
        url: "https://example.com/nonmatch",
        title: "Sales manager",
      },
    ],
    company: job.company,
    fetchedAt: "2026-09-06T01:00:00Z",
    cached: false,
  };
};
try {
  await new ProfileRecordsService().importCv({
    sourceKind: "paste",
    content:
      "Synthetic CV. Senior Software Engineer. Built TypeScript and React applications.",
  });
  await service.saveSettings({
    sources: ["fixture", "broken"],
    scheduleTimes: [],
  });
  const first = await service.scan();
  assert.equal(
    (await service.scan()).id,
    first.id,
    "active scans are coalesced",
  );
  const claimed = await repo.claim();
  assert.equal(
    await repo.claim(),
    null,
    "unexpired lease cannot be claimed twice",
  );
  await runner.execute(claimed, source);
  assert.equal((await repo.runs())[0].status, "partial");
  const results = await service.results(first.id, "all", "0");
  assert.equal(results.total, 3);
  assert.equal(results.items.filter((x) => x.verdict === "match").length, 1);
  assert.equal((await service.results(first.id)).items[0].stage, "shortlisted");
  const current = await matching.criteria();
  const appliedId = (await service.results(first.id)).items[0].job_id;
  await pool.query("UPDATE applications SET stage='applied' WHERE job_id=$1", [
    appliedId,
  ]);
  const again = await service.scan();
  await runner.execute(await repo.claim(), source);
  assert.equal((await service.results(again.id)).items[0].stage, "applied");
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM stage_events WHERE to_stage='shortlisted'",
      )
    ).rows[0].n,
    1,
  );
  await matching.save(
    { ...current.rules, autoShortlist: false },
    current.version,
  );
  const scheduled = await service.scan("scheduled", "2026-09-07T09:00+08:00");
  await pool.query(
    "UPDATE discovery_runs SET status='running',lease_until=now()-interval '1 second',attempts=1 WHERE id=$1",
    [scheduled.id],
  );
  const recovered = await repo.claim();
  assert.equal(recovered.attempts, 2);
  await runner.execute(recovered, source);
  assert.equal(
    (await service.scan("scheduled", "2026-09-07T09:00+08:00")).id,
    scheduled.id,
  );
  console.log(
    "Discovery database checks passed: CV-derived criteria, coalescing, leases/recovery, partial sources, complete result lists, stage preservation and schedule idempotency.",
  );
  if (process.env.CAREEROS_LIVE_SOURCE_CHECK === "yes") {
    const fresh = await matching.criteria();
    await matching.save({ ...fresh.rules, autoShortlist: true }, fresh.version);
    await service.saveSettings({
      sources: ["cloudflare", "stripe", "mongodb", "datadog", "elastic"],
      scheduleTimes: [],
    });
    await service.scan();
    await runner.execute(await repo.claim());
    const report = (await repo.runs())[0];
    console.log(
      "Live public-board results:",
      JSON.stringify(report.source_results),
    );
    assert.ok(
      report.source_results.some(
        (x) => x.status === "completed" && x.checked > 0,
      ),
      "at least one live source should complete",
    );
  }
} finally {
  await pool.end();
}
