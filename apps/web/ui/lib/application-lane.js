export function applicationLane(job) {
  if (job?.lane) return job.lane;
  const fit = Number(job?.fit) || 0;
  if (fit >= 75) return "A — Priority";
  if (fit >= 60) return "B — Volume";
  return "C — Strategic stretch";
}

export function isQuickApply(job) {
  const minutes = Number(job?.effortMinutes);
  if (minutes) return minutes <= 15;
  return /15 minutes|quick/i.test(`${job?.effort || ""} ${job?.action || ""}`);
}
