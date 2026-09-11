import { randomUUID } from "node:crypto";
import { importedSnapshots } from "../src/data/imported-snapshots.js";

const defaultSources = [
  ...new Set(
    importedSnapshots
      .flatMap((snapshot) => snapshot.jobs.map((job) => job.source))
      .filter(Boolean),
  ),
];
let settings = {
  sources: defaultSources,
  schedule_times: ["08:00", "13:00", "18:00"],
  updated_at: new Date().toISOString(),
};

function sourceReport(jobs) {
  const counts = new Map();
  for (const job of jobs)
    counts.set(
      job.source || "Recorded source",
      (counts.get(job.source || "Recorded source") || 0) + 1,
    );
  return [...counts].map(([source, checked]) => ({
    source,
    company: source,
    status: "recorded",
    checked,
    matched: checked,
  }));
}

function result(snapshot, job) {
  return {
    source: job.source || "Recorded source",
    source_job_id: String(job.id),
    job_id: null,
    title: job.title || "",
    company: job.company || "",
    url: job.url || "",
    location: job.location || "",
    salary: job.salary || "",
    verdict: job.verdict === "review" ? "review" : "match",
    reasons: Array.isArray(job.reasons) ? job.reasons : [],
    gaps: Array.isArray(job.gaps) ? job.gaps : [],
    matched_skills: Array.isArray(job.matched_skills) ? job.matched_skills : [],
    stage: null,
    recorded_at: snapshot.scannedAt,
  };
}

function recordedRun(snapshot) {
  return {
    id: `recorded-${snapshot.id}`,
    status: "completed",
    trigger: "recorded-import",
    created_at: snapshot.scannedAt,
    started_at: snapshot.scannedAt,
    finished_at: snapshot.scannedAt,
    error: null,
    source_results: sourceReport(snapshot.jobs),
    plan: {
      sources: [
        ...new Set(snapshot.jobs.map((job) => job.source).filter(Boolean)),
      ],
      mode: "recorded-scan-refresh",
      snapshotId: snapshot.id,
    },
  };
}

const seededRuns = importedSnapshots.map(recordedRun);
const seededResults = new Map(
  importedSnapshots.map((snapshot) => [
    `recorded-${snapshot.id}`,
    snapshot.jobs.map((job) => result(snapshot, job)),
  ]),
);
const refreshedRuns = [];
const refreshedResults = new Map();

export function recordedDiscoveryOverview() {
  return {
    settings: { ...settings },
    runs: [...refreshedRuns, ...seededRuns].slice(0, 20),
    signals: { skills: [], roleTerms: [], cvImportId: null },
    criteria: {
      version: 1,
      rules: {
        location: "Hong Kong or eligibility to confirm",
        salaryFloorHkd: null,
        roleTerms: [],
        requiredTerms: [],
        excludeTerms: [],
        autoShortlist: false,
      },
    },
    provenance: {
      mode: "recorded-scan-refresh",
      notice:
        "This refresh ingests previously recorded scan data. It is not a fresh internet search.",
    },
  };
}

export function refreshRecordedDiscovery(now = new Date()) {
  const latest =
    importedSnapshots.find((snapshot) => snapshot.jobs.length > 0) ||
    importedSnapshots[0];
  const timestamp = now.toISOString();
  const id = randomUUID();
  const items = latest.jobs.map((job) => result(latest, job));
  const run = {
    id,
    status: "completed",
    trigger: "recorded-refresh",
    created_at: timestamp,
    started_at: timestamp,
    finished_at: timestamp,
    error: null,
    source_results: sourceReport(items),
    plan: {
      sources: [...new Set(items.map((item) => item.source))],
      mode: "recorded-scan-refresh",
      snapshotId: latest.id,
    },
  };
  refreshedRuns.unshift(run);
  refreshedResults.set(id, items);
  if (refreshedRuns.length > 7) refreshedResults.delete(refreshedRuns.pop().id);
  return run;
}

export function recordedDiscoveryResults(runId, verdict = "match", offset = 0) {
  const all = refreshedResults.get(runId) || seededResults.get(runId);
  if (!all) return null;
  const filtered =
    verdict === "all" ? all : all.filter((item) => item.verdict === verdict);
  return { items: filtered.slice(offset, offset + 50), total: filtered.length };
}

export function mergeDiscoveryOverview(remote = {}) {
  const local = recordedDiscoveryOverview();
  const seen = new Set();
  const runs = [
    ...(Array.isArray(remote.runs) ? remote.runs : []),
    ...local.runs,
  ]
    .filter((run) => run?.id && !seen.has(run.id) && seen.add(run.id))
    .slice(0, 20);
  return {
    ...remote,
    settings: local.settings,
    runs,
    signals: remote.signals || local.signals,
    criteria: remote.criteria || local.criteria,
    provenance: {
      mode: "combined-live-and-recorded",
      notice:
        "Live connector history and recorded CareerOS research are shown together. Recorded refreshes do not claim a new internet search.",
    },
  };
}

export function saveRecordedDiscoverySettings(value, now = new Date()) {
  const sources = Array.isArray(value?.sources)
    ? value.sources.filter((item) => typeof item === "string").slice(0, 20)
    : settings.sources;
  const scheduleTimes = Array.isArray(value?.scheduleTimes)
    ? value.scheduleTimes
        .filter((item) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item))
        .slice(0, 4)
        .sort()
    : settings.schedule_times;
  settings = {
    sources,
    schedule_times: scheduleTimes,
    updated_at: now.toISOString(),
  };
  return { ...settings };
}
