import type { Decision, ImportDraft } from "./pipeline.types";

export const emptyImportDraft: ImportDraft = {
  originalUrl: "",
  company: "",
  title: "",
  description: "",
  requirements: "",
};

export function localDate(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function dueLabel(item: Decision, today = localDate()) {
  if (item.completed_at) return "Completed";
  if (!item.due_date) return "No follow-up date";
  if (item.due_date < today) return `Overdue · ${item.due_date}`;
  if (item.due_date === today) return "Due today";
  return `Due ${item.due_date}`;
}

export function isOverdue(item: Decision, today = localDate()) {
  return !item.completed_at && Boolean(item.due_date && item.due_date < today);
}

export function requirementTaskTitle(requirement: string) {
  return `Prepare: ${requirement}`;
}

export function toManualBatchImport(jobs: ImportDraft[], now = new Date()) {
  return {
    adapter: "manual-structured" as const,
    extractedAt: now.toISOString(),
    extractionVersion: "manual-batch-form-v1",
    jobs: jobs.map((job) => ({
      ...job,
      requirements: job.requirements
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    })),
  };
}
