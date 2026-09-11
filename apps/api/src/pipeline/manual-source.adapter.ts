import type { ManualBatchImport } from "./pipeline.schemas";

export type ManualJobForm = {
  company: string;
  title: string;
  url: string;
  description: string;
  requirements: string[];
};

export function manualFormImport(
  job: ManualJobForm,
  extractedAt = new Date().toISOString(),
): ManualBatchImport {
  return {
    adapter: "manual-structured",
    extractedAt,
    extractionVersion: "manual-form-v1",
    jobs: [
      {
        originalUrl: job.url,
        company: job.company,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      },
    ],
  };
}
