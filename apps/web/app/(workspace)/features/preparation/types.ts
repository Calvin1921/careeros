export type ReviewStatus = "unknown" | "direct" | "transferable" | "gap";
export type SelfRating = "needs-work" | "ready" | null;
export type PreparationReview = {
  status: ReviewStatus;
  evidenceId: string | null;
  evidenceKind: "learning" | "project" | "production" | null;
  notes: string;
  response: string;
  selfRating: SelfRating;
  version: number;
  invalidatedReason: string | null;
};
export type EvidenceOption = {
  id: string;
  signature: string;
  capabilityId: string;
  capabilityName: string;
  kind: "learning" | "project" | "production";
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
};
export type PreparationRequirement = {
  key: string;
  text: string;
  review: PreparationReview;
  evidenceOptions: EvidenceOption[];
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    completedAt: string | null;
    version: number;
  }>;
};
export type PreparationOverview = {
  jobId: string;
  summary: {
    total: number;
    reviewed: number;
    practiced: number;
    ready: number;
  };
  requirements: PreparationRequirement[];
};
export type ReviewInput = Pick<
  PreparationReview,
  "status" | "evidenceId" | "notes" | "response" | "selfRating"
> & { expectedVersion: number; expectedEvidenceSignature: string | null };
export const reviewLabels: Record<ReviewStatus, string> = {
  unknown: "Not yet verified",
  direct: "Direct evidence",
  transferable: "Transferable evidence",
  gap: "Gap to work on",
};
