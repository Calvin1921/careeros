import { createHash } from "node:crypto";
import type { Stage } from "@careeros/domain";
import {
  PipelineConflictError,
  PipelineValidationError,
} from "./pipeline.errors";
import type {
  ManualBatchImport,
  ManualStructuredJob,
  StageCorrection,
} from "./pipeline.schemas";

const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
]);

export function normalizeSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new PipelineValidationError("originalUrl must be a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new PipelineValidationError("originalUrl must use HTTP or HTTPS.");
  if (url.username || url.password)
    throw new PipelineValidationError(
      "originalUrl must not contain credentials.",
    );

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");

  const parameters = [...url.searchParams.entries()]
    .filter(
      ([key]) =>
        !key.toLowerCase().startsWith("utm_") &&
        !trackingParameters.has(key.toLowerCase()),
    )
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    );
  url.search = "";
  for (const [key, item] of parameters) url.searchParams.append(key, item);
  return url.toString();
}

export function sourceSnapshotKey(
  input: Pick<
    ManualBatchImport,
    "adapter" | "extractedAt" | "extractionVersion"
  >,
  job: ManualStructuredJob,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        adapter: input.adapter,
        extractedAt: input.extractedAt,
        extractionVersion: input.extractionVersion,
        job,
      }),
    )
    .digest("hex");
}

export function assertCorrectionCurrentStage(
  currentStage: Stage,
  correction: StageCorrection,
) {
  if (currentStage !== correction.fromStage)
    throw new PipelineConflictError(
      `Application stage changed from ${correction.fromStage} to ${currentStage}. Refresh before correcting it.`,
    );
}

export function assertDecisionVersion(current: number, expected: number) {
  if (current !== expected)
    throw new PipelineConflictError(
      "This decision changed in another request. Refresh before editing it again.",
    );
}
