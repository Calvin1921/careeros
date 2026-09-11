import { useMutation, useQueryClient } from "@tanstack/react-query";
import { readApi } from "../lib/live-api";

export function useDiscoverySchedule(sources = []) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (scheduleTimes) =>
      readApi("/discovery/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CareerOS-Action": "schedule",
        },
        body: JSON.stringify({ sources, scheduleTimes }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["live-discovery"] }),
  });
  return {
    saveSchedule: mutation.mutateAsync,
    saving: mutation.isPending,
    scheduleError: mutation.error?.message || "",
  };
}
