"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  PreparationOverview,
  PreparationReview,
  ReviewInput,
} from "../features/preparation/types";

export function usePreparation(jobId: string) {
  return useQuery({
    queryKey: ["preparation", jobId],
    queryFn: ({ signal }) =>
      api<PreparationOverview>(
        `jobs/${jobId}/preparation`,
        "GET",
        undefined,
        signal,
      ),
    // Explicit refresh and version checks keep background fetches from replacing an open draft.
    refetchOnWindowFocus: false,
  });
}

export function usePreparationActions(jobId: string) {
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["preparation", jobId] });
  const save = useMutation({
    mutationFn: ({ key, ...input }: ReviewInput & { key: string }) =>
      api<PreparationReview>(
        `jobs/${jobId}/preparation/requirements/${key}`,
        "PUT",
        input,
      ),
    onSuccess: async (saved, { key }) => {
      await client.cancelQueries({ queryKey: ["preparation", jobId] });
      // Apply the acknowledged write before refreshing: a failed GET must not
      // restore the old answer or old version when the editor remounts.
      client.setQueryData<PreparationOverview>(
        ["preparation", jobId],
        (current) => {
          if (!current) return current;
          const requirements = current.requirements.map((item) =>
            item.key === key ? { ...item, review: saved } : item,
          );
          return {
            ...current,
            requirements,
            summary: {
              total: requirements.length,
              reviewed: requirements.filter(
                (item) => item.review.status !== "unknown",
              ).length,
              practiced: requirements.filter(
                (item) => !!item.review.response.trim(),
              ).length,
              ready: requirements.filter(
                (item) =>
                  item.review.status !== "unknown" &&
                  !!item.review.response.trim() &&
                  item.review.selfRating === "ready",
              ).length,
            },
          };
        },
      );
      await refresh();
    },
  });
  const capture = useMutation({
    mutationFn: (text: string) =>
      api(`jobs/${jobId}/preparation/requirements`, "POST", { text }),
    onSuccess: async () => {
      await Promise.all([
        refresh(),
        client.invalidateQueries({ queryKey: ["pipeline", jobId] }),
        client.invalidateQueries({ queryKey: ["job", jobId] }),
      ]);
    },
  });
  const schedule = useMutation({
    mutationFn: ({ key, dueDate }: { key: string; dueDate: string }) =>
      api(`jobs/${jobId}/preparation/requirements/${key}/tasks`, "POST", {
        dueDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        refresh(),
        client.invalidateQueries({ queryKey: ["pipeline", jobId] }),
        client.invalidateQueries({ queryKey: ["workspace"] }),
      ]);
    },
  });
  return { save, capture, schedule };
}
