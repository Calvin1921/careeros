import { opportunityPriority } from "./opportunity-priority.js";

const globalRemotePattern =
  /worldwide remote|remote.*worldwide|remote everywhere|global(?:ly)? remote|remote global|remote-only.*(?:world|global)|hire(?:s|d)? (?:around the world|globally)/i;

export function locationMatches(job, filter = "all") {
  const location = String(job?.location || "");
  if (filter === "hong-kong") return /hong kong/i.test(location);
  if (filter === "worldwide-remote")
    return globalRemotePattern.test(location) && !/hong kong/i.test(location);
  return true;
}

export function searchMatches(job, query = "") {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    job?.company,
    job?.title,
    job?.location,
    job?.salary,
    job?.action,
    ...(job?.matched_skills || []),
  ].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(term),
  );
}

function updatedTime(job, recordFor) {
  const record = recordFor(job);
  return (
    Date.parse(record.updatedAt || record.history?.at(-1)?.occurredAt || "") ||
    0
  );
}

export function sortOpportunities(
  jobs,
  sort = "recommended",
  recordFor = () => ({}),
) {
  return [...jobs].sort((left, right) => {
    if (sort === "recently-found")
      return (
        (Date.parse(right.snapshotAt || 0) || 0) -
          (Date.parse(left.snapshotAt || 0) || 0) ||
        opportunityPriority(right) - opportunityPriority(left)
      );
    if (sort === "recently-updated")
      return (
        updatedTime(right, recordFor) - updatedTime(left, recordFor) ||
        (Date.parse(right.snapshotAt || 0) || 0) -
          (Date.parse(left.snapshotAt || 0) || 0)
      );
    return (
      opportunityPriority(right) - opportunityPriority(left) ||
      (Date.parse(right.snapshotAt || 0) || 0) -
        (Date.parse(left.snapshotAt || 0) || 0)
    );
  });
}

export function formatDiscoveredAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Discovery time unavailable";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `Found ${get("day")} ${get("month").replace("Sept", "Sep")} · ${get("hour")}:${get("minute")} ${get("dayPeriod").toLowerCase()} HKT`;
}

export function statusPresentation(job, record, readiness) {
  if (record?.possibleDuplicate)
    return { label: "Possible duplicate", kind: "duplicate" };
  const status = record?.status || "Not started";
  if (status === "Not started")
    return { label: readiness.label, kind: readiness.kind };
  const kinds = {
    "Ready to apply": "ready",
    Applied: "applied",
    "Recruiter screen": "screen",
    Interview: "interview",
    Offer: "offer",
    Rejected: "rejected",
    Withdrawn: "withdrawn",
  };
  return { label: status, kind: kinds[status] || "neutral" };
}
