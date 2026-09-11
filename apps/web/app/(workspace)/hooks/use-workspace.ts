"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
export type Overview = {
  today: string;
  decisions: Array<{
    id: string;
    job_id: string;
    title: string;
    due_date: string;
    company: string;
    role_title: string;
  }>;
  missingMaterials: Array<{
    id: string;
    company: string;
    title: string;
    has_draft: boolean;
  }>;
  pendingClaims: Array<{
    id: string;
    employer: string;
    role_title: string;
    summary: string;
  }>;
  counts: { total: number; active: number };
};
export function useWorkspace() {
  const now = new Date(),
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return useQuery<Overview>({
    queryKey: ["workspace", today],
    queryFn: ({ signal }) =>
      api<Overview>(
        `workspace/overview?today=${today}`,
        "GET",
        undefined,
        signal,
      ),
  });
}
