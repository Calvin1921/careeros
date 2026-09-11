import { useCallback, useMemo, useState } from "react";
import {
  applicationStatuses,
  funnelGuidance,
  funnelMetrics,
  opportunityKey,
  resolvePriorApplicationFlag,
  withApplicationStatus,
  withPriorApplicationFlag,
} from "../lib/application-status.js";

const storageKey = "portfolio-demo-careeros.application-tracker.v1";

export function normalizeApplicationRecords(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 500)
      .map(([key, record]) => {
        const source =
          record && typeof record === "object" && !Array.isArray(record)
            ? record
            : {};
        const history = Array.isArray(source.history)
          ? source.history
              .slice(-200)
              .filter((item) => item && typeof item === "object")
              .map((item) => ({
                status: String(item.status || "Update").slice(0, 100),
                occurredAt: String(item.occurredAt || ""),
                type: String(item.type || "status").slice(0, 60),
              }))
          : [];
        const possibleDuplicate =
          source.possibleDuplicate &&
          typeof source.possibleDuplicate === "object"
            ? {
                reportedAt: String(source.possibleDuplicate.reportedAt || ""),
                note: String(source.possibleDuplicate.note || "").slice(0, 500),
              }
            : undefined;
        const updatedAt = Number.isNaN(Date.parse(source.updatedAt || ""))
          ? undefined
          : String(source.updatedAt);
        return [
          String(key).slice(0, 240),
          {
            status: applicationStatuses.includes(source.status)
              ? source.status
              : "Not started",
            history,
            ...(updatedAt ? { updatedAt } : {}),
            ...(possibleDuplicate ? { possibleDuplicate } : {}),
          },
        ];
      }),
  );
}

function readStoredRecords() {
  if (typeof window === "undefined") return {};
  try {
    return normalizeApplicationRecords(
      JSON.parse(window.localStorage.getItem(storageKey) || "{}"),
    );
  } catch {
    return {};
  }
}

function persistRecords(value) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* in-memory tracking remains usable */
  }
}

export function useApplicationTracker() {
  const [records, setRecords] = useState(readStoredRecords);
  const updateStatus = useCallback((job, status) => {
    const occurredAt = new Date().toISOString();
    setRecords((current) => {
      const next = withApplicationStatus(current, job, status, occurredAt);
      if (next === current) return current;
      persistRecords(next);
      return next;
    });
  }, []);
  const flagPriorApplication = useCallback((job, note) => {
    setRecords((current) => {
      const next = withPriorApplicationFlag(current, job, note);
      persistRecords(next);
      return next;
    });
  }, []);
  const resolvePriorApplication = useCallback((job, resolution) => {
    setRecords((current) => {
      const next = resolvePriorApplicationFlag(current, job, resolution);
      persistRecords(next);
      return next;
    });
  }, []);
  const recordFor = useCallback(
    (job) =>
      records[opportunityKey(job)] || { status: "Not started", history: [] },
    [records],
  );
  const metrics = useMemo(() => funnelMetrics(records), [records]);
  const guidance = useMemo(() => funnelGuidance(metrics), [metrics]);
  return {
    records,
    recordFor,
    updateStatus,
    flagPriorApplication,
    resolvePriorApplication,
    metrics,
    guidance,
  };
}
