import { jobs } from "./jobs.js";
import { mergeImportedJobs } from "../lib/job-scan-adapter.js";
export const importedSnapshots = [
  {
    id: "fictional-2026-09-11",
    label: "11 September · Fictional demo",
    scannedAt: "2026-09-11T13:00:00+08:00",
    conversation: "Fictional portfolio dataset",
    jobs,
  },
  {
    id: "fictional-2026-09-10",
    label: "10 September · Fictional demo",
    scannedAt: "2026-09-10T13:00:00+08:00",
    conversation: "Fictional portfolio dataset",
    jobs: jobs.slice(0, 4),
  },
];
export const consolidatedSnapshot = importedSnapshots[0];
export function allImportedJobs() {
  return mergeImportedJobs(importedSnapshots);
}
export function jobsForSnapshot(id) {
  const s = importedSnapshots.find((x) => x.id === id);
  return s
    ? s.jobs.map((job) => ({
        ...job,
        snapshot: true,
        snapshotId: s.id,
        snapshotLabel: s.label,
        snapshotAt: s.scannedAt,
        conversation: s.conversation,
        verdict: "match",
      }))
    : [];
}
