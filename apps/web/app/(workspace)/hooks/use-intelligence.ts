"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { MemoryEntry, Analytics } from "../features/intelligence/types";
export function useAnalytics(from: string, to: string, timezone: string) {
  const query = new URLSearchParams({ timezone });
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  return useQuery<Analytics>({
    queryKey: ["analytics", from, to, timezone],
    queryFn: ({ signal }) =>
      api<Analytics>(
        `intelligence/analytics?${query}`,
        "GET",
        undefined,
        signal,
      ),
  });
}
export function useMemory(scope: string) {
  return useQuery<{ entries: MemoryEntry[] }>({
    queryKey: ["memory", scope],
    queryFn: ({ signal }) =>
      api<{ entries: MemoryEntry[] }>(
        `intelligence/memory?scope=${encodeURIComponent(scope)}`,
        "GET",
        undefined,
        signal,
      ),
  });
}
export function useMemoryAction(scope: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method,
      data,
    }: {
      path: string;
      method: string;
      data?: unknown;
    }) => api(`intelligence/${path}`, method, data),
    onSuccess: () => client.invalidateQueries({ queryKey: ["memory", scope] }),
  });
}
