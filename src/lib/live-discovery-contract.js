const cacheVersion = 1;
const cacheKey = "portfolio-demo-careeros.live-discovery.v1";
const allowedVerdicts = new Set(["match", "review", "excluded"]);
const allowedStatuses = new Set(["queued", "running", "completed", "failed"]);
const defaultRefreshMs = 30_000;
const activeRefreshMs = 2_000;

const array = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value : "");
const nullableText = (value) => (typeof value === "string" ? value : null);

function validDate(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export function normalizeResult(value) {
  if (!value || typeof value !== "object") return null;
  const source = text(value.source);
  const sourceJobId = text(value.source_job_id);
  if (!source || !sourceJobId) return null;
  return {
    source,
    source_job_id: sourceJobId,
    job_id: nullableText(value.job_id),
    title: text(value.title),
    company: text(value.company),
    url: text(value.url),
    location: text(value.location),
    salary: text(value.salary),
    verdict: allowedVerdicts.has(value.verdict) ? value.verdict : "review",
    reasons: array(value.reasons).filter((item) => typeof item === "string"),
    gaps: array(value.gaps).filter((item) => typeof item === "string"),
    matched_skills: array(value.matched_skills).filter(
      (item) => typeof item === "string",
    ),
    stage: nullableText(value.stage),
  };
}

export function normalizeResultsPage(value) {
  const items = array(value?.items)
    .map(normalizeResult)
    .filter(Boolean)
    .slice(0, 50);
  const reportedTotal = Number(value?.total);
  return {
    items,
    total:
      Number.isInteger(reportedTotal) && reportedTotal >= items.length
        ? reportedTotal
        : items.length,
  };
}

export function normalizeRun(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string")
    return null;
  return {
    id: value.id,
    status: allowedStatuses.has(value.status) ? value.status : "failed",
    trigger: text(value.trigger) || "recorded",
    created_at: validDate(value.created_at),
    started_at: validDate(value.started_at),
    finished_at: validDate(value.finished_at),
    error: nullableText(value.error),
    source_results: array(value.source_results)
      .slice(0, 20)
      .map((item) => ({
        token: text(item?.token || item?.source),
        company: text(item?.company),
        status: text(item?.status) || "recorded",
        checked: Number.isFinite(Number(item?.checked))
          ? Number(item.checked)
          : 0,
        matched: Number.isFinite(Number(item?.matched))
          ? Number(item.matched)
          : 0,
      })),
    plan: value.plan && typeof value.plan === "object" ? value.plan : {},
  };
}

function hktParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function nextScheduledRefresh(scheduleTimes, now = new Date()) {
  const times = array(scheduleTimes)
    .filter((value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    .sort();
  if (!times.length) return null;
  const { year, month, day } = hktParts(now);
  for (const addDay of [0, 1]) {
    for (const time of times) {
      const [hour, minute] = time.split(":").map(Number);
      const candidate = new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day) + addDay,
          hour - 8,
          minute,
        ),
      );
      if (candidate > now) return candidate.toISOString();
    }
  }
  return null;
}

export function normalizeOverview(value, now = new Date()) {
  const scheduleTimes = array(value?.settings?.schedule_times)
    .filter(
      (item) =>
        typeof item === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item),
    )
    .slice(0, 4)
    .sort();
  const runs = array(value?.runs)
    .map(normalizeRun)
    .filter(Boolean)
    .slice(0, 12);
  return {
    settings: {
      sources: array(value?.settings?.sources)
        .filter((item) => typeof item === "string")
        .slice(0, 20),
      schedule_times: scheduleTimes,
      updated_at: validDate(value?.settings?.updated_at),
    },
    runs,
    signals: {
      skills: array(value?.signals?.skills).filter(
        (item) => typeof item === "string",
      ),
      roleTerms: array(value?.signals?.roleTerms).filter(
        (item) => typeof item === "string",
      ),
      cvImportId: nullableText(value?.signals?.cvImportId),
    },
    criteria:
      value?.criteria && typeof value.criteria === "object"
        ? value.criteria
        : null,
    refresh: {
      timezone: "Asia/Hong_Kong",
      scheduleTimes,
      nextRefreshAt: nextScheduledRefresh(scheduleTimes, now),
      intervalMs: runs.some((run) => ["queued", "running"].includes(run.status))
        ? activeRefreshMs
        : defaultRefreshMs,
    },
  };
}

export function readDiscoveryCache(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(cacheKey));
    if (value?.version !== cacheVersion) return { overview: null, pages: {} };
    return {
      overview: value.overview ? normalizeOverview(value.overview) : null,
      pages: value.pages && typeof value.pages === "object" ? value.pages : {},
    };
  } catch {
    return { overview: null, pages: {} };
  }
}

export function writeDiscoveryOverview(
  overview,
  storage = globalThis.localStorage,
) {
  try {
    const current = readDiscoveryCache(storage);
    storage.setItem(
      cacheKey,
      JSON.stringify({
        version: cacheVersion,
        overview: normalizeOverview(overview),
        pages: current.pages,
      }),
    );
  } catch {
    /* caching is optional */
  }
}

export function readDiscoveryResults(
  runId,
  verdict,
  offset,
  storage = globalThis.localStorage,
) {
  const page =
    readDiscoveryCache(storage).pages[`${runId}:${verdict}:${offset}`];
  return page ? normalizeResultsPage(page) : null;
}

export function writeDiscoveryResults(
  runId,
  verdict,
  offset,
  page,
  storage = globalThis.localStorage,
) {
  try {
    const current = readDiscoveryCache(storage);
    const pages = {
      ...current.pages,
      [`${runId}:${verdict}:${offset}`]: normalizeResultsPage(page),
    };
    const entries = Object.entries(pages).slice(-48);
    storage.setItem(
      cacheKey,
      JSON.stringify({
        version: cacheVersion,
        overview: current.overview,
        pages: Object.fromEntries(entries),
      }),
    );
  } catch {
    /* caching is optional */
  }
}

export function discoveryRefreshInterval(overview) {
  return overview?.refresh?.intervalMs || defaultRefreshMs;
}
