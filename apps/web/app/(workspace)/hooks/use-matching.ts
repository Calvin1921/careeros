"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  CriteriaVersion,
  Criteria,
  Evaluation,
  SourceRecord,
} from "../features/matching/types";
export function useMatching() {
  const client = useQueryClient();
  const criteria = useQuery({
    queryKey: ["matching", "criteria"],
    queryFn: () => api<CriteriaVersion>("matching/criteria"),
  });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["matching"] }),
      client.invalidateQueries({ queryKey: ["jobs"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
      client.invalidateQueries({ queryKey: ["job"] }),
      client.invalidateQueries({ queryKey: ["pipeline"] }),
    ]);
  const save = useMutation({
    mutationFn: (value: Criteria & { expectedVersion: number }) =>
      api<CriteriaVersion>("matching/criteria", "PUT", value),
    onSuccess: refresh,
  });
  const process = useMutation({
    mutationFn: () =>
      api<{ evaluated: number; shortlisted: number }>(
        "matching/process",
        "POST",
        {},
      ),
    onSuccess: refresh,
  });
  return { criteria, save, process };
}
export function useMatchResults() {
  return useQuery({
    queryKey: ["matching", "results"],
    queryFn: () => api<Evaluation[]>("matching/results"),
  });
}
export function useSourceHistory() {
  return useQuery({
    queryKey: ["matching", "history"],
    queryFn: () => api<SourceRecord[]>("matching/history"),
  });
}
