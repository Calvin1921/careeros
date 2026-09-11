export type Evidence = {
  id: string;
  kind: "learning" | "project" | "production";
  summary: string;
  source_url: string;
  source_label: string;
  verified: boolean;
  attested_at: string | null;
};
export type Capability = {
  id: string;
  name: string;
  technologies: string[];
  transferable_principles: string[];
  learning_hours: number;
  evidence: Evidence[];
  readiness: {
    knowledge: boolean;
    practice: boolean;
    production: boolean;
    claimLevel: string;
  };
};
export type Experience = {
  id: string;
  kind: string;
  employer: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
  location: string;
  summary: string;
  sourceRefs: Array<{
    quote?: string;
    line?: number;
    path?: string;
    type?: string;
  }>;
  unresolvedQuestions: string[];
  status: "proposed" | "confirmed";
  confirmedAt: string | null;
};
export type Milestone = {
  id: string;
  capability_id: string;
  title: string;
  week_start: string;
  weekly_hours: number;
  practical_evidence_goal: string;
  status: string;
  evidence_id: string | null;
};
export type Workspace = {
  profile: null | {
    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website_url: string;
    linkedin_url: string;
    summary: string;
  };
  imports: Array<{
    id: string;
    sourceKind: string;
    filename: string | null;
    preview: string;
    createdAt: string;
  }>;
  experiences: Experience[];
  versions: Array<{
    id: string;
    versionNumber: number;
    profileSnapshot: { fullName?: string };
    experienceSnapshot: Array<{ id: string; summary: string }>;
    evidenceSnapshot: Array<{
      id: string;
      capabilityName: string;
      summary: string;
      sourceUrl: string;
    }>;
    createdAt: string;
  }>;
  capabilities: Capability[];
  milestones: Milestone[];
};
export const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export type ProfileSectionProps = {
  workspace: Workspace;
  busy: boolean;
  run: (
    path: string,
    method: "POST" | "PATCH",
    data: unknown,
    notice: string,
  ) => Promise<boolean>;
};
