import { PreparationValidationError } from "./preparation.errors";

export const preparationStatuses = [
  "unknown",
  "direct",
  "transferable",
  "gap",
] as const;
export const preparationRatings = ["needs-work", "ready"] as const;

export type PreparationStatus = (typeof preparationStatuses)[number];
export type PreparationRating = (typeof preparationRatings)[number];
export type PreparationUpdate = {
  expectedVersion: number;
  expectedEvidenceSignature: string | null;
  status: PreparationStatus;
  evidenceId: string | null;
  notes: string;
  response: string;
  selfRating: PreparationRating | null;
};

function fail(message: string): never {
  throw new PreparationValidationError(message);
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object.`);
  return value as Record<string, unknown>;
}

function exactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
  name: string,
) {
  const supplied = Object.keys(input);
  const missing = expected.filter((key) => !Object.hasOwn(input, key));
  const unsupported = supplied.filter((key) => !expected.includes(key));
  if (missing.length || unsupported.length)
    fail(`${name} must contain exactly: ${expected.join(", ")}.`);
}

function boundedText(value: unknown, name: string, maximum: number) {
  if (typeof value !== "string" || value.trim().length > maximum)
    fail(`${name} must be text of at most ${maximum} characters.`);
  return value.trim();
}

export function parseUuid(value: unknown, label = "ID") {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    fail(`${label} is invalid.`);
  return value;
}

export function parseRequirementKey(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^requirement-[1-9]\d{0,2}-[0-9a-f]{16}$/.test(value)
  )
    fail("Requirement key is invalid.");
  return value;
}

export function parseDate(value: unknown, label = "dueDate") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(`${label} must be a date in YYYY-MM-DD format.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(`${label} must be a real calendar date.`);
  return value;
}

export function parsePreparationUpdate(value: unknown): PreparationUpdate {
  const input = object(value, "preparation review");
  const fields = [
    "expectedVersion",
    "expectedEvidenceSignature",
    "status",
    "evidenceId",
    "notes",
    "response",
    "selfRating",
  ] as const;
  exactKeys(input, fields, "preparation review");
  if (
    !Number.isInteger(input.expectedVersion) ||
    Number(input.expectedVersion) < 0
  )
    fail("expectedVersion must be a non-negative integer.");
  if (
    typeof input.status !== "string" ||
    !(preparationStatuses as readonly string[]).includes(input.status)
  )
    fail("status is invalid.");
  const status = input.status as PreparationStatus;
  const expectedEvidenceSignature = input.expectedEvidenceSignature;
  if (
    expectedEvidenceSignature !== null &&
    (typeof expectedEvidenceSignature !== "string" ||
      !/^[0-9a-f]{64}$/.test(expectedEvidenceSignature))
  )
    fail("expectedEvidenceSignature must be a SHA-256 signature or null.");
  const evidenceId =
    input.evidenceId === null
      ? null
      : parseUuid(input.evidenceId, "Evidence ID");
  if (
    ((status === "direct" || status === "transferable") && !evidenceId) ||
    ((status === "unknown" || status === "gap") && evidenceId)
  )
    fail(
      "Direct or transferable reviews require evidence; unknown or gap reviews cannot use evidence.",
    );
  if (
    ((status === "direct" || status === "transferable") &&
      !expectedEvidenceSignature) ||
    ((status === "unknown" || status === "gap") &&
      expectedEvidenceSignature !== null)
  )
    fail(
      "Direct or transferable reviews require an evidence signature; unknown or gap reviews require null.",
    );
  const notes = boundedText(input.notes, "notes", 3000);
  const response = boundedText(input.response, "response", 10000);
  if (
    input.selfRating !== null &&
    (typeof input.selfRating !== "string" ||
      !(preparationRatings as readonly string[]).includes(input.selfRating))
  )
    fail("selfRating is invalid.");
  const selfRating = input.selfRating as PreparationRating | null;
  if (selfRating && !response)
    fail("A self-rating requires a practice response.");
  return {
    expectedVersion: Number(input.expectedVersion),
    expectedEvidenceSignature,
    status,
    evidenceId,
    notes,
    response,
    selfRating,
  };
}

export function parseTaskInput(value: unknown) {
  const input = object(value, "preparation task");
  exactKeys(input, ["dueDate"], "preparation task");
  return { dueDate: parseDate(input.dueDate) };
}

export function parseRequirementInput(value: unknown) {
  const input = object(value, "requirement excerpt");
  exactKeys(input, ["text"], "requirement excerpt");
  const text = boundedText(input.text, "text", 500);
  if (!text) fail("text must contain a requirement excerpt.");
  return { text };
}
