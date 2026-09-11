"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobRecord, Stage } from "@careeros/domain";
import { api } from "../lib/api";
export type Artifact = {
  id: string;
  kind: string;
  status: string;
  content: Record<string, unknown> | null;
  error: string | null;
};
export type JobDetail = JobRecord & { artifacts: Artifact[] };
export function useJobs() {
  return useQuery<JobRecord[]>({
    queryKey: ["jobs"],
    queryFn: ({ signal }) => api<JobRecord[]>("jobs", "GET", undefined, signal),
  });
}
export function useJob(id: string) {
  return useQuery<JobDetail>({
    queryKey: ["job", id],
    queryFn: ({ signal }) =>
      api<JobDetail>(`jobs/${id}`, "GET", undefined, signal),
    refetchInterval: (query) =>
      query.state.data?.artifacts.some((a) => a.status === "queued")
        ? 2000
        : false,
  });
}
export function useJobActions(id: string) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["job", id] }),
      client.invalidateQueries({ queryKey: ["jobs"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
      client.invalidateQueries({ queryKey: ["matching"] }),
      client.invalidateQueries({ queryKey: ["pipeline", id] }),
    ]);
  };
  const stage = useMutation({
    mutationFn: (stage: Stage) => api(`jobs/${id}/stage`, "PATCH", { stage }),
    onSuccess: refresh,
  });
  const prepare = useMutation({
    mutationFn: (kind: string) => api(`jobs/${id}/artifacts`, "POST", { kind }),
    onSuccess: refresh,
  });
  return { stage, prepare, refresh };
}
