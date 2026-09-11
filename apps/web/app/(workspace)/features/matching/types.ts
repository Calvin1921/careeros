export type Criteria = {
  roleTerms: string[];
  requiredTerms: string[];
  excludeTerms: string[];
  location: "hk-or-global" | "any";
  salaryFloorHkd: number | null;
  autoShortlist: boolean;
};
export type CriteriaVersion = {
  version: number;
  rules: Criteria | null;
  created_at?: string;
};
export type Evaluation = {
  job_id: string;
  verdict: "match" | "review" | "excluded";
  reasons: string[];
  gaps: string[];
  criteria_version: number;
  created_at: string;
  extracted_at: string;
};
export type SourceRecord = {
  id: string;
  job_id: string;
  company: string;
  title: string;
  stage: string;
  adapter: string;
  extracted_at: string;
  created_at: string;
  extraction_version: string;
  verdict: Evaluation["verdict"] | null;
  reasons: string[] | null;
  gaps: string[] | null;
  criteria_version: number | null;
};
