import { useMemo, useState } from "react";
import {
  allImportedJobs,
  importedSnapshots,
  jobsForSnapshot,
} from "../data/imported-snapshots";
import { locationMatches, searchMatches } from "../lib/opportunity-list";

const storageKey = "portfolio-demo-careeros.opportunity-view.v1";
const defaults = {
  snapshotId: "all",
  query: "",
  locationFilter: "all",
  sort: "recommended",
  statusFilter: "all",
};
const allowed = {
  locationFilter: new Set(["all", "hong-kong", "worldwide-remote"]),
  sort: new Set(["recommended", "recently-found", "recently-updated"]),
  statusFilter: new Set(["all", "to-apply", "in-progress", "closed"]),
};

function readView() {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return {
      snapshotId:
        stored.snapshotId === "all" ||
        importedSnapshots.some((item) => item.id === stored.snapshotId)
          ? stored.snapshotId
          : defaults.snapshotId,
      query: String(stored.query || "").slice(0, 160),
      locationFilter: allowed.locationFilter.has(stored.locationFilter)
        ? stored.locationFilter
        : defaults.locationFilter,
      sort: allowed.sort.has(stored.sort) ? stored.sort : defaults.sort,
      statusFilter: allowed.statusFilter.has(stored.statusFilter)
        ? stored.statusFilter
        : defaults.statusFilter,
    };
  } catch {
    return defaults;
  }
}

export function useImportedOpportunities() {
  const [view, setView] = useState(readView);
  const updateView = (patch) =>
    setView((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* current visit remains usable */
      }
      return next;
    });
  const jobs = useMemo(() => {
    const selected =
      view.snapshotId === "all"
        ? allImportedJobs()
        : jobsForSnapshot(view.snapshotId);
    return selected.filter(
      (job) =>
        searchMatches(job, view.query) &&
        locationMatches(job, view.locationFilter),
    );
  }, [view.snapshotId, view.query, view.locationFilter]);
  return {
    snapshots: importedSnapshots,
    ...view,
    jobs,
    setSnapshotId: (snapshotId) => updateView({ snapshotId }),
    setQuery: (query) => updateView({ query }),
    setLocationFilter: (locationFilter) => updateView({ locationFilter }),
    setSort: (sort) => updateView({ sort }),
    setStatusFilter: (statusFilter) => updateView({ statusFilter }),
    reset: () => updateView(defaults),
  };
}
