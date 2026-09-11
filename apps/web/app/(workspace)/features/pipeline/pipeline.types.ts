import type { Stage } from "@careeros/domain";

export type SourceSnapshot = {
  id: string;
  adapter: string;
  original_url: string;
  normalized_url: string;
  extracted_at: string;
  extraction_version: string;
};

export type Decision = {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  version: number;
};

export type StageEvent = {
  id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  event_kind: "transition" | "correction";
  reason: string | null;
  created_at: string;
};

export type PipelineOverview = {
  stage: Stage;
  requirements: string[];
  sources: SourceSnapshot[];
  decisions: Decision[];
  events: StageEvent[];
};

export type ImportDraft = {
  originalUrl: string;
  company: string;
  title: string;
  description: string;
  requirements: string;
};

export type ImportResult = {
  status: "created" | "duplicate";
  jobId: string;
};

export type NewDecision = { title: string; dueDate: string | null };
export type DecisionUpdate = {
  decisionId: string;
  expectedVersion: number;
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
};
