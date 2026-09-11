"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  DiscoveryOverview,
  ScanRun,
  ScanResult,
} from "../features/discovery/types";
export function useDiscovery() {
  const client = useQueryClient();
  const overview = useQuery({
    queryKey: ["discovery"],
    queryFn: () => api<DiscoveryOverview>("discovery"),
    refetchInterval: (query) =>
      query.state.data?.runs.some((r) =>
        ["queued", "running"].includes(r.status),
      )
        ? 1500
        : 10000,
  });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["discovery"] }),
      client.invalidateQueries({ queryKey: ["scan-results"] }),
      client.invalidateQueries({ queryKey: ["jobs"] }),
      client.invalidateQueries({ queryKey: ["matching"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
    ]);
  const scan = useMutation({
    mutationFn: () => api<ScanRun>("discovery/scans", "POST", {}),
    onSuccess: refresh,
  });
  const settings = useMutation({
    mutationFn: (data: { sources: string[]; scheduleTimes: string[] }) =>
      api("discovery/settings", "PUT", data),
    onSuccess: refresh,
  });
  return { overview, scan, settings, refresh };
}
export function useScanResults(
  id: string | undefined,
  verdict: string,
  offset: number,
  running: boolean,
) {
  return useQuery({
    queryKey: ["scan-results", id, verdict, offset],
    enabled: Boolean(id),
    queryFn: () =>
      api<{ items: ScanResult[]; total: number }>(
        `discovery/scans/${id}/results?verdict=${verdict}&offset=${offset}`,
      ),
    refetchInterval: running ? 1500 : false,
  });
}
