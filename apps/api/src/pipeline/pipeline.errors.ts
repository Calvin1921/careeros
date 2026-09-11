export class PipelineValidationError extends Error {}
export class PipelineConflictError extends Error {}
export class PipelineNotFoundError extends Error {}

export class DuplicateJobError extends PipelineConflictError {
  constructor(
    readonly result: {
      status: "duplicate";
      jobId: string;
      normalizedUrl: string;
      snapshotId: string;
    },
  ) {
    super("This job URL is already saved.");
  }
}
