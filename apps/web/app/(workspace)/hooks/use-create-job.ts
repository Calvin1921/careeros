"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
export function useCreateJob() {
  const router = useRouter(),
    client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["jobs"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
      client.invalidateQueries({ queryKey: ["matching"] }),
    ]);
  };
  const save = useMutation({
    mutationFn: (data: unknown) => api<{ id: string }>("jobs", "POST", data),
    onSuccess: async (job) => {
      await refresh();
      router.push(`/jobs/${job.id}`);
    },
  });
  return { save, refresh };
}
