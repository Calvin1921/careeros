import { useEffect, useMemo, useState } from "react";

const storageKey = "portfolio-demo-careeros.selected-opportunity.v1";

function storedSelection() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey) || "";
  } catch {
    return "";
  }
}

export function useOpportunitySelection(jobs) {
  const [selectedId, setSelectedId] = useState(storedSelection);
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) || jobs[0] || null,
    [jobs, selectedId],
  );
  useEffect(() => {
    if (!selectedJob || selectedJob.id === selectedId) return;
    setSelectedId(selectedJob.id);
  }, [selectedId, selectedJob]);
  const selectJob = (job) => {
    setSelectedId(job.id);
    try {
      window.localStorage.setItem(storageKey, job.id);
    } catch {
      /* current visit remains usable */
    }
  };
  return { selectedJob, selectJob };
}
