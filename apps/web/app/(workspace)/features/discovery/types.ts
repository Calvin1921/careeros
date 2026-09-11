import type { Criteria } from "../matching/types";
export type SourceReport = {
  token: string;
  company?: string;
  status: string;
  fetchedAt?: string;
  cached?: boolean;
  checked?: number;
  matched?: number;
  added?: number;
  error?: string;
};
export type ScanRun = {
  id: string;
  status: string;
  trigger: string;
  created_at: string;
  finished_at: string | null;
  error: string | null;
  source_results: SourceReport[];
  plan: {
    rules: Criteria;
    skills: string[];
    criteriaVersion: number;
    sources: string[];
    cvImportId: string | null;
  };
};
export type DiscoveryOverview = {
  settings: { sources: string[]; schedule_times: string[]; updated_at: string };
  runs: ScanRun[];
  signals: { skills: string[]; roleTerms: string[]; cvImportId: string | null };
  criteria: { version: number; rules: Criteria } | null;
};
export type ScanResult = {
  source: string;
  source_job_id: string;
  job_id: string | null;
  title: string;
  company: string;
  url: string;
  location: string;
  salary: string;
  verdict: string;
  reasons: string[];
  gaps: string[];
  matched_skills: string[];
  stage: string | null;
};
