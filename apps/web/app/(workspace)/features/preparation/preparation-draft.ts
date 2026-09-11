import type {
  EvidenceOption,
  PreparationRequirement,
  PreparationReview,
  ReviewStatus,
  SelfRating,
} from "./types";

const draftVersion = 1;
const draftPrefix = "careeros:preparation-draft:v1";
const selectionPrefix = "careeros:preparation-selection:v1";
const statuses = new Set<ReviewStatus>([
  "unknown",
  "direct",
  "transferable",
  "gap",
]);
const ratings = new Set<Exclude<SelfRating, null>>(["needs-work", "ready"]);
const evidenceKinds = new Set(["learning", "project", "production"]);

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PreparationDraftFields = {
  status: ReviewStatus;
  evidenceId: string;
  notes: string;
  response: string;
  selfRating: SelfRating;
};

export type PreparationDraft = {
  schemaVersion: typeof draftVersion;
  jobId: string;
  requirementKey: string;
  requirementText: string;
  originalReview: PreparationReview;
  evidenceSnapshot: EvidenceOption | null;
  fields: PreparationDraftFields;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maximum: number) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function uuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

function requirementKey(value: unknown) {
  return typeof value === "string" &&
    /^requirement-[1-9]\d{0,2}-[0-9a-f]{16}$/.test(value)
    ? value
    : null;
}

function review(value: unknown): PreparationReview | null {
  if (!isRecord(value) || !statuses.has(value.status as ReviewStatus))
    return null;
  const evidenceId = value.evidenceId === null ? null : uuid(value.evidenceId);
  const evidenceKind =
    value.evidenceKind === null || evidenceKinds.has(String(value.evidenceKind))
      ? (value.evidenceKind as PreparationReview["evidenceKind"])
      : undefined;
  const notes = boundedString(value.notes, 3000);
  const response = boundedString(value.response, 10000);
  const invalidatedReason =
    value.invalidatedReason === null
      ? null
      : boundedString(value.invalidatedReason, 1000);
  const selfRating =
    value.selfRating === null || ratings.has(value.selfRating as "ready")
      ? (value.selfRating as SelfRating)
      : undefined;
  if (
    (evidenceId === null && value.evidenceId !== null) ||
    evidenceKind === undefined ||
    notes === null ||
    response === null ||
    (invalidatedReason === null && value.invalidatedReason !== null) ||
    selfRating === undefined ||
    !Number.isInteger(value.version) ||
    Number(value.version) < 0
  )
    return null;
  return {
    status: value.status as ReviewStatus,
    evidenceId,
    evidenceKind,
    notes,
    response,
    selfRating,
    version: Number(value.version),
    invalidatedReason,
  };
}

function evidence(value: unknown): EvidenceOption | null {
  if (!isRecord(value)) return null;
  const id = uuid(value.id);
  const capabilityId = uuid(value.capabilityId);
  const signature = boundedString(value.signature, 64);
  const capabilityName = boundedString(value.capabilityName, 200);
  const summary = boundedString(value.summary, 3000);
  const sourceLabel = boundedString(value.sourceLabel, 500);
  const sourceUrl = boundedString(value.sourceUrl, 1000);
  if (
    !id ||
    !capabilityId ||
    !signature ||
    !/^[0-9a-f]{64}$/.test(signature) ||
    capabilityName === null ||
    !evidenceKinds.has(String(value.kind)) ||
    summary === null ||
    sourceLabel === null ||
    sourceUrl === null
  )
    return null;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
  } catch {
    return null;
  }
  return {
    id,
    capabilityId,
    signature,
    capabilityName,
    kind: value.kind as EvidenceOption["kind"],
    summary,
    sourceLabel,
    sourceUrl,
  };
}

function fields(value: unknown): PreparationDraftFields | null {
  if (!isRecord(value) || !statuses.has(value.status as ReviewStatus))
    return null;
  const evidenceId = boundedString(value.evidenceId, 36);
  const notes = boundedString(value.notes, 3000);
  const response = boundedString(value.response, 10000);
  const selfRating =
    value.selfRating === null || ratings.has(value.selfRating as "ready")
      ? (value.selfRating as SelfRating)
      : undefined;
  if (
    evidenceId === null ||
    (evidenceId !== "" && !uuid(evidenceId)) ||
    notes === null ||
    response === null ||
    selfRating === undefined
  )
    return null;
  return {
    status: value.status as ReviewStatus,
    evidenceId,
    notes,
    response,
    selfRating,
  };
}

export function parsePreparationDraft(value: unknown): PreparationDraft | null {
  if (!isRecord(value) || value.schemaVersion !== draftVersion) return null;
  const jobId = uuid(value.jobId);
  const key = requirementKey(value.requirementKey);
  const text = boundedString(value.requirementText, 500);
  const originalReview = review(value.originalReview);
  const draftFields = fields(value.fields);
  const evidenceSnapshot =
    value.evidenceSnapshot === null ? null : evidence(value.evidenceSnapshot);
  if (
    !jobId ||
    !key ||
    !text?.trim() ||
    !originalReview ||
    !draftFields ||
    (value.evidenceSnapshot !== null && !evidenceSnapshot) ||
    (draftFields.evidenceId && evidenceSnapshot?.id !== draftFields.evidenceId)
  )
    return null;
  return {
    schemaVersion: draftVersion,
    jobId,
    requirementKey: key,
    requirementText: text,
    originalReview,
    evidenceSnapshot,
    fields: draftFields,
  };
}

function draftKey(jobId: string, key: string) {
  return `${draftPrefix}:${jobId}:${key}`;
}

function selectionKey(jobId: string) {
  return `${selectionPrefix}:${jobId}`;
}

export function browserDraftStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPreparationDraft(
  storage: DraftStorage | null,
  jobId: string,
  key: string,
) {
  if (!storage) return null;
  const storageKey = draftKey(jobId, key);
  try {
    const serialized = storage.getItem(storageKey);
    if (!serialized) return null;
    const parsed = parsePreparationDraft(JSON.parse(serialized));
    if (!parsed || parsed.jobId !== jobId || parsed.requirementKey !== key) {
      storage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(storageKey);
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }
    return null;
  }
}

export function writePreparationDraft(
  storage: DraftStorage | null,
  draft: PreparationDraft,
) {
  if (!storage || !parsePreparationDraft(draft)) return false;
  try {
    storage.setItem(
      draftKey(draft.jobId, draft.requirementKey),
      JSON.stringify(draft),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPreparationDraft(
  storage: DraftStorage | null,
  jobId: string,
  key: string,
) {
  if (!storage) return;
  try {
    storage.removeItem(draftKey(jobId, key));
  } catch {
    // Saving to the server must still work when browser storage is unavailable.
  }
}

export function createPreparationDraft(
  jobId: string,
  requirement: PreparationRequirement,
  draftFields: PreparationDraftFields,
): PreparationDraft {
  const supported =
    draftFields.status === "direct" || draftFields.status === "transferable";
  return {
    schemaVersion: draftVersion,
    jobId,
    requirementKey: requirement.key,
    requirementText: requirement.text,
    originalReview: { ...requirement.review },
    evidenceSnapshot: supported
      ? (requirement.evidenceOptions.find(
          (item) => item.id === draftFields.evidenceId,
        ) ?? null)
      : null,
    fields: { ...draftFields },
  };
}

export function recoverPreparationRequirement(
  current: PreparationRequirement,
  draft: PreparationDraft,
) {
  const evidenceOptions = draft.evidenceSnapshot
    ? [
        ...current.evidenceOptions.filter(
          (item) => item.id !== draft.evidenceSnapshot?.id,
        ),
        draft.evidenceSnapshot,
      ]
    : current.evidenceOptions;
  return {
    ...current,
    review: draft.originalReview,
    evidenceOptions,
  };
}

export function readSelectedRequirement(
  storage: DraftStorage | null,
  jobId: string,
) {
  if (!storage) return null;
  try {
    return requirementKey(storage.getItem(selectionKey(jobId)));
  } catch {
    return null;
  }
}

export function writeSelectedRequirement(
  storage: DraftStorage | null,
  jobId: string,
  key: string,
) {
  if (!storage || !requirementKey(key)) return;
  try {
    storage.setItem(selectionKey(jobId), key);
  } catch {
    // Selection memory is optional.
  }
}
