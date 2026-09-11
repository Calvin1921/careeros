import { useMemo } from "react";
import { useImportedOpportunities } from "./useImportedOpportunities";
import { statusGroup } from "../lib/application-status";
import { sortOpportunities } from "../lib/opportunity-list";

export function useOpportunityArchiveModel(tracker) {
  const archive = useImportedOpportunities();
  const jobs = useMemo(
    () =>
      sortOpportunities(
        archive.jobs.filter(
          (job) =>
            archive.statusFilter === "all" ||
            statusGroup(tracker.recordFor(job).status) === archive.statusFilter,
        ),
        archive.sort,
        tracker.recordFor,
      ),
    [archive.jobs, archive.statusFilter, archive.sort, tracker.recordFor],
  );
  const counts = useMemo(
    () =>
      archive.jobs.reduce(
        (result, job) => {
          const group = statusGroup(tracker.recordFor(job).status);
          result.all += 1;
          result[group] += 1;
          return result;
        },
        { all: 0, "to-apply": 0, "in-progress": 0, closed: 0 },
      ),
    [archive.jobs, tracker.recordFor],
  );
  return { archive, jobs, counts };
}
