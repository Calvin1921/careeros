import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { readApi } from "../lib/live-api";
import {
  discoveryRefreshInterval,
  normalizeOverview,
  normalizeResultsPage,
  readDiscoveryCache,
  readDiscoveryResults,
  writeDiscoveryOverview,
  writeDiscoveryResults,
} from "../lib/live-discovery-contract";
export function useLiveDiscovery(initialVerdict = "match") {
  const client = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [verdict, setVerdict] = useState(initialVerdict);
  const overviewQuery = useQuery({
    queryKey: ["live-discovery"],
    queryFn: async ({ signal }) => {
      try {
        const value = normalizeOverview(
          await readApi("/discovery", { signal }),
        );
        writeDiscoveryOverview(value);
        return value;
      } catch (error) {
        const cached = readDiscoveryCache().overview;
        if (cached) return cached;
        throw error;
      }
    },
    refetchInterval: (query) => discoveryRefreshInterval(query.state.data),
    retry: 1,
  });
  const overview = overviewQuery.data;
  const runs = overview?.runs || [];
  const run = runs.find((run) => run.id === selected) || runs[0];
  const resultsQuery = useInfiniteQuery({
    queryKey: ["live-results", run?.id, verdict],
    enabled: !!run,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      try {
        const page = normalizeResultsPage(
          await readApi(
            `/discovery/scans/${run.id}/results?verdict=${verdict}&offset=${pageParam}`,
            { signal },
          ),
        );
        writeDiscoveryResults(run.id, verdict, pageParam, page);
        return page;
      } catch (error) {
        const cached = readDiscoveryResults(run.id, verdict, pageParam);
        if (cached) return cached;
        throw error;
      }
    },
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < last.total && last.items.length ? loaded : undefined;
    },
    refetchInterval: ["queued", "running"].includes(run?.status) ? 2000 : false,
    retry: 1,
  });
  const scanMutation = useMutation({
    mutationFn: () =>
      readApi("/discovery/scans", {
        method: "POST",
        headers: { "X-CareerOS-Action": "scan" },
      }),
    onSuccess: async (run) => {
      setSelected(run.id);
      await client.invalidateQueries({ queryKey: ["live-discovery"] });
      await client.invalidateQueries({ queryKey: ["live-results"] });
    },
  });
  return {
    overview,
    runs,
    run,
    selectRun: setSelected,
    results: resultsQuery.data?.pages.flatMap((page) => page.items) || [],
    total: resultsQuery.data?.pages[0]?.total || 0,
    hasMore: !!resultsQuery.hasNextPage,
    loadMore: () => resultsQuery.fetchNextPage(),
    loading: overviewQuery.isPending || (!!run && resultsQuery.isPending),
    refreshing: resultsQuery.isFetching,
    error:
      overviewQuery.error?.message ||
      resultsQuery.error?.message ||
      scanMutation.error?.message,
    scan: () => scanMutation.mutate(),
    scanning:
      scanMutation.isPending ||
      runs.some((run) => ["queued", "running"].includes(run.status)),
    verdict,
    setVerdict,
    retry: () => {
      scanMutation.reset();
      overviewQuery.refetch();
      if (run) resultsQuery.refetch();
    },
  };
}
