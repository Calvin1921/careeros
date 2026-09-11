"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Workspace } from "./types";

export function useProfileWorkspace() {
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) =>
      api<Workspace>("profile", "GET", undefined, signal),
  });
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      data,
    }: {
      path: string;
      method: "POST" | "PATCH";
      data: unknown;
    }) => api(path, method, data),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["profile"] }),
        client.invalidateQueries({ queryKey: ["workspace"] }),
        client.invalidateQueries({ queryKey: ["discovery"] }),
      ]);
    },
  });
  async function run(
    path: string,
    method: "POST" | "PATCH",
    data: unknown,
    message: string,
  ) {
    setNotice("");
    try {
      await mutation.mutateAsync({ path, method, data });
      setNotice(message);
      return true;
    } catch {
      return false;
    }
  }
  return {
    run,
    notice,
    ...query,
    mutateAsync: mutation.mutateAsync,
    busy: mutation.isPending,
    mutationError: mutation.error,
  };
}
