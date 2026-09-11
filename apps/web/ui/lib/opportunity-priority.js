const freshnessScore = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("0–3") || text.includes("current scan")) return 100;
  if (text.includes("active official") || text.includes("live official"))
    return 95;
  if (text.includes("4–7")) return 85;
  if (text.includes("8–14")) return 70;
  if (text.includes("active")) return 75;
  return 55;
};

const actionScore = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("immediate") || text.includes("apply now")) return 100;
  if (text.includes("apply after")) return 65;
  if (text.includes("apply")) return 80;
  return 50;
};

export function opportunityPriority(job) {
  const fit = Number(job.fit) || 50;
  const interview = Number(job.interviewChance) || 40;
  return Math.round(
    fit * 0.65 +
      interview * 0.2 +
      freshnessScore(job.freshness) * 0.1 +
      actionScore(job.action) * 0.05,
  );
}

export function rankedOpportunities(jobs) {
  return [...jobs].sort(
    (left, right) =>
      opportunityPriority(right) - opportunityPriority(left) ||
      new Date(right.snapshotAt || 0) - new Date(left.snapshotAt || 0),
  );
}
