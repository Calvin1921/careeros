import { createHash } from "node:crypto";
import { PreparationConflictError } from "./preparation.errors";

export type Requirement = { key: string; text: string };

export function requirementEntries(value: unknown): Requirement[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && !!item.trim())
    .map((item, index) => {
      const text = item.trim();
      const signature = createHash("sha256")
        .update(`${index}\u0000${text}`)
        .digest("hex")
        .slice(0, 16);
      return { key: `requirement-${index + 1}-${signature}`, text };
    });
}

export function findRequirement(value: unknown, key: string) {
  return requirementEntries(value).find((item) => item.key === key);
}

export type EvidenceForSignature = {
  id: string;
  capability_id: string;
  kind: string;
  summary: string;
  source_url: string;
  source_label: string;
};

export function evidenceSignature(evidence: EvidenceForSignature) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: evidence.id,
        capabilityId: evidence.capability_id,
        kind: evidence.kind,
        summary: evidence.summary,
        sourceUrl: evidence.source_url,
        sourceLabel: evidence.source_label,
      }),
    )
    .digest("hex");
}

export function assertPreparationVersion(
  currentVersion: number | undefined,
  expectedVersion: number,
) {
  if ((currentVersion ?? 0) !== expectedVersion)
    throw new PreparationConflictError(
      "This preparation review changed in another request. Refresh before saving.",
    );
}
