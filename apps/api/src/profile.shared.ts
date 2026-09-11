import { BadRequestException, ConflictException } from "@nestjs/common";

export const experienceKinds = [
  "experience",
  "education",
  "project",
  "certification",
  "other",
] as const;
export const evidenceKinds = ["learning", "project", "production"] as const;
export const milestoneStatuses = [
  "planned",
  "in-progress",
  "completed",
] as const;
export type ExperienceKind = (typeof experienceKinds)[number];
export type EvidenceKind = (typeof evidenceKinds)[number];
type SourceRef =
  | { importId: string; line?: number; path?: string; quote: string }
  | { type: "user-entry" };

export type ProposedExperience = {
  kind: ExperienceKind;
  employer: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
  location: string;
  summary: string;
  sourceRefs: SourceRef[];
  unresolvedQuestions: string[];
};

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequestException("Expected an object request body.");
  return value as Record<string, unknown>;
}
export function requiredString(
  value: unknown,
  label: string,
  min = 1,
  max = 3000,
) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new BadRequestException(`${label} must be ${min}-${max} characters.`);
  return value.trim();
}
export function optionalString(value: unknown, label: string, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length > max)
    throw new BadRequestException(
      `${label} must be at most ${max} characters.`,
    );
  return value.trim();
}
export function stringList(
  value: unknown,
  label: string,
  maxItems: number,
  maxLength: number,
) {
  if (!Array.isArray(value) || value.length > maxItems)
    throw new BadRequestException(
      `${label} must be a list of at most ${maxItems} items.`,
    );
  return value.map((item) => requiredString(item, label, 1, maxLength));
}
export function oneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value))
    throw new BadRequestException(`${label} is invalid.`);
  return value as T[number];
}
export function httpUrl(value: string, label: string) {
  if (!value) return value;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new BadRequestException(`${label} must be an HTTP(S) URL.`);
  }
  return value;
}
export function uuid(value: unknown, label = "ID") {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException(`${label} is invalid.`);
  return value;
}
export function dateOnly(value: unknown, label: string) {
  const result = requiredString(value, label, 10, 10);
  const parsed = new Date(`${result}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== result
  )
    throw new BadRequestException(`${label} must use YYYY-MM-DD.`);
  return result;
}
function jsonString(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const key of keys)
    if (typeof record[key] === "string") return (record[key] as string).trim();
  return "";
}

export function proposeExperiences(
  importId: string,
  sourceKind: "paste" | "text" | "json",
  original: string,
): ProposedExperience[] {
  const review =
    "Review this source-backed proposal, complete its fields, and remove this question before confirming.";
  if (sourceKind !== "json") {
    const lines = original
      .split(/\r?\n/)
      .map((line, index) => ({ text: line.trim(), line: index + 1 }))
      .filter((line) => line.text);
    if (lines.length > 200)
      throw new BadRequestException(
        "Import contains more than 200 non-empty lines.",
      );
    return lines.map(({ text, line }) => ({
      kind: "other",
      employer: "",
      roleTitle: "",
      startDate: "",
      endDate: "",
      location: "",
      summary: text,
      sourceRefs: [{ importId, line, quote: text }],
      unresolvedQuestions: [review],
    }));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(original);
  } catch {
    throw new BadRequestException("The selected JSON file is not valid JSON.");
  }
  const root =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  const items = Array.isArray(parsed) ? parsed : root?.experiences;
  if (!Array.isArray(items))
    throw new BadRequestException(
      "JSON imports must be an array or contain an experiences array.",
    );
  if (items.length > 100)
    throw new BadRequestException(
      "JSON import contains more than 100 experiences.",
    );
  return items.map((item, index) => {
    const path = Array.isArray(parsed)
      ? `$[${index}]`
      : `$.experiences[${index}]`;
    const quote = typeof item === "string" ? item.trim() : JSON.stringify(item);
    if (!quote)
      throw new BadRequestException(`JSON item ${index + 1} is empty.`);
    return {
      kind: "experience",
      employer: jsonString(item, ["employer", "company", "organization"]),
      roleTitle: jsonString(item, ["roleTitle", "title", "role"]),
      startDate: jsonString(item, ["startDate", "start"]),
      endDate: jsonString(item, ["endDate", "end"]),
      location: jsonString(item, ["location"]),
      summary:
        typeof item === "string"
          ? quote
          : jsonString(item, ["summary", "description", "details"]) || quote,
      sourceRefs: [{ importId, path, quote }],
      unresolvedQuestions: [review],
    };
  });
}

export function evidenceVerificationAfterPatch(
  current: { verified: boolean; attested_at: string | null },
  patch: Record<string, unknown>,
) {
  const contentChanged = ["kind", "summary", "sourceUrl", "sourceLabel"].some(
    (key) => patch[key] !== undefined,
  );
  if (patch.attested === true) return { verified: true, attested: true };
  if (patch.attested === false || contentChanged)
    return { verified: false, attested: false };
  return { verified: current.verified, attested: Boolean(current.attested_at) };
}
export function confirmedExperiencesForSnapshot<
  T extends { status: string; confirmed_at?: unknown; confirmedAt?: unknown },
>(rows: T[]) {
  return rows.filter(
    (row) =>
      row.status === "confirmed" &&
      Boolean(row.confirmed_at ?? row.confirmedAt),
  );
}
export function assertSelectedEvidenceIsAttested<
  T extends {
    id: string;
    verified: boolean;
    attested_at?: unknown;
    attestedAt?: unknown;
  },
>(rows: T[], selectedIds: string[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const selected = selectedIds.map((id) => byId.get(id));
  if (
    selected.some(
      (row) =>
        !row || !row.verified || !Boolean(row.attested_at ?? row.attestedAt),
    )
  )
    throw new ConflictException(
      "Every selected evidence item must still be explicitly attested.",
    );
  return selected as T[];
}
export function parseCapabilityPatch(body: unknown) {
  const data = object(body);
  if (
    !["name", "technologies", "transferablePrinciples", "learningHours"].some(
      (key) => data[key] !== undefined,
    )
  )
    throw new BadRequestException(
      "Provide at least one capability field to update.",
    );
  const name = optionalString(data.name, "Capability name", 200);
  if (name !== undefined && !name)
    throw new BadRequestException("Capability name cannot be empty.");
  const technologies =
    data.technologies === undefined
      ? undefined
      : stringList(data.technologies, "Technologies", 30, 100);
  if (technologies && !technologies.length)
    throw new BadRequestException("Add at least one technology.");
  const transferablePrinciples =
    data.transferablePrinciples === undefined
      ? undefined
      : stringList(
          data.transferablePrinciples,
          "Transferable principles",
          30,
          300,
        );
  const learningHours = data.learningHours;
  if (
    learningHours !== undefined &&
    (!Number.isInteger(learningHours) ||
      (learningHours as number) < 0 ||
      (learningHours as number) > 10000)
  )
    throw new BadRequestException(
      "Learning hours must be a whole number from 0 to 10000.",
    );
  return {
    name,
    technologies,
    transferablePrinciples,
    learningHours: learningHours as number | undefined,
  };
}
export function readiness(
  evidence: Array<{
    kind: EvidenceKind;
    verified: boolean;
    attested_at: string | null;
  }>,
) {
  const confirmed = evidence.filter(
    (item) => item.verified && item.attested_at,
  );
  const knowledge = confirmed.some((item) => item.kind === "learning");
  const practice = confirmed.some((item) => item.kind === "project");
  const production = confirmed.some((item) => item.kind === "production");
  return {
    knowledge,
    practice,
    production,
    claimLevel: production
      ? "production experience"
      : practice
        ? "demonstrated in a project"
        : knowledge
          ? "learning foundations"
          : "not yet evidenced",
  };
}
export function mapExperience(row: Record<string, unknown>) {
  return {
    id: row.id,
    importId: row.import_id,
    kind: row.kind,
    employer: row.employer,
    roleTitle: row.role_title,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    summary: row.summary,
    sourceRefs: row.source_refs,
    unresolvedQuestions: row.unresolved_questions,
    status: row.status,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
