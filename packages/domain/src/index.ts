import { z } from "zod";
export const stages = [
  "discovered",
  "shortlisted",
  "applied",
  "screening",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type Stage = (typeof stages)[number];
const moves: Record<Stage, readonly Stage[]> = {
  discovered: ["shortlisted", "withdrawn"],
  shortlisted: ["applied", "withdrawn"],
  applied: ["screening", "interview", "rejected", "withdrawn"],
  screening: ["interview", "offer", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};
export function canTransition(from: Stage, to: Stage) {
  return from === to || moves[from].includes(to);
}
export const newJob = z
  .object({
    company: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
    url: z.url().refine((v) => /^https?:\/\//.test(v), "Use an HTTP(S) URL"),
    description: z.string().trim().min(20).max(50000),
    requirements: z
      .array(z.string().trim().min(1).max(500))
      .max(30)
      .default([]),
  })
  .strict();
export const changeStage = z.object({ stage: z.enum(stages) }).strict();
export const requestArtifact = z
  .object({ kind: z.enum(["application-package", "interview-prep"]) })
  .strict();
export const newCapability = z
  .object({
    name: z.string().trim().min(1).max(200),
    technologies: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
    transferablePrinciples: z
      .array(z.string().trim().min(1).max(300))
      .max(30)
      .default([]),
    learningHours: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const newEvidence = z
  .object({
    capabilityId: z.uuid(),
    kind: z.enum(["learning", "project", "production"]),
    summary: z.string().trim().min(5).max(3000),
    sourceUrl: z.url().refine((v) => /^https?:\/\//.test(v)),
    sourceLabel: z.string().trim().max(500).default(""),
    verified: z.boolean().default(false),
  })
  .strict();
export type TaskKind =
  | "extract"
  | "classify"
  | "normalize"
  | "summarize"
  | "plan"
  | "code"
  | "review"
  | "position"
  | "interview";
export type Tier = "economy" | "standard" | "strong";
export type ArtifactKind = z.infer<typeof requestArtifact>["kind"];
export interface JobRecord {
  id: string;
  company: string;
  title: string;
  url: string;
  description: string;
  requirements: string[];
  stage: Stage;
  created_at: string;
}
export interface MemoryPort {
  propose(entry: {
    scope: string;
    sourceId: string;
    content: string;
    expiresAt?: string;
  }): Promise<string>;
  retrieve(
    scope: string,
  ): Promise<
    Array<{ id: string; sourceId: string; content: string; verified: boolean }>
  >;
  forget(id: string, scope: string): Promise<void>;
}
export function claimLevel(
  evidence: Array<{
    kind: "learning" | "project" | "production";
    verified: boolean;
  }>,
) {
  const verified = evidence.filter((e) => e.verified);
  return verified.some((e) => e.kind === "production")
    ? "production experience"
    : verified.some((e) => e.kind === "project")
      ? "demonstrated in a project"
      : verified.some((e) => e.kind === "learning")
        ? "learning foundations"
        : "not yet evidenced";
}
