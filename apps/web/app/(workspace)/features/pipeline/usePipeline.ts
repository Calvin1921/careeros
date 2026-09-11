"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Stage } from "@careeros/domain";
import { api } from "../../lib/api";
import type {
  Decision,
  DecisionUpdate,
  ImportResult,
  NewDecision,
  PipelineOverview,
} from "./pipeline.types";

async function invalidateJob(
  client: ReturnType<typeof useQueryClient>,
  jobId: string,
) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ["pipeline", jobId] }),
    client.invalidateQueries({ queryKey: ["preparation", jobId] }),
    client.invalidateQueries({ queryKey: ["job", jobId] }),
    client.invalidateQueries({ queryKey: ["jobs"] }),
    client.invalidateQueries({ queryKey: ["workspace"] }),
    client.invalidateQueries({ queryKey: ["matching"] }),
  ]);
}

export function usePipeline(jobId: string) {
  return useQuery({
    queryKey: ["pipeline", jobId],
    queryFn: ({ signal }) =>
      api<PipelineOverview>(`jobs/${jobId}/pipeline`, "GET", undefined, signal),
  });
}

export function useDecisionMutations(jobId: string, onChanged?: () => void) {
  const client = useQueryClient();
  const changed = async () => {
    await invalidateJob(client, jobId);
    onChanged?.();
  };
  const create = useMutation({
    mutationFn: (decision: NewDecision) =>
      api<Decision>(`jobs/${jobId}/decisions`, "POST", decision),
    onSuccess: changed,
  });
  const update = useMutation({
    mutationFn: ({ decisionId, ...update }: DecisionUpdate) =>
      api<Decision>(`jobs/${jobId}/decisions/${decisionId}`, "PATCH", update),
    onSuccess: changed,
  });
  return { create, update };
}

export function useStageCorrection(jobId: string, onChanged?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (correction: {
      fromStage: Stage;
      toStage: Stage;
      reason: string;
    }) => api(`jobs/${jobId}/stage-correction`, "PATCH", correction),
    onSuccess: async () => {
      await invalidateJob(client, jobId);
      onChanged?.();
    },
  });
}

export function useJobImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) =>
      api<{ results: ImportResult[] }>("pipeline/imports", "POST", input),
    onSuccess: async ({ results }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["jobs"] }),
        client.invalidateQueries({ queryKey: ["workspace"] }),
        client.invalidateQueries({ queryKey: ["matching"] }),
        ...results.flatMap((result) => [
          client.invalidateQueries({ queryKey: ["pipeline", result.jobId] }),
          client.invalidateQueries({ queryKey: ["job", result.jobId] }),
        ]),
      ]);
    },
  });
}
