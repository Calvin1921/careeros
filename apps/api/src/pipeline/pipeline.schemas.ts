import { stages, type Stage } from "@careeros/domain";
import { PipelineValidationError } from "./pipeline.errors";
import { normalizeSourceUrl } from "./pipeline.rules";

export type Schema<T> = { parse(value: unknown): T };

export type ManualStructuredJob = {
  originalUrl: string;
  company: string;
  title: string;
  description: string;
  requirements: string[];
};

export type ManualBatchImport = {
  adapter: "manual-structured";
  extractedAt: string;
  extractionVersion: string;
  jobs: ManualStructuredJob[];
};

export type NewDecision = { title: string; dueDate: string | null };
export type UpdateDecision = {
  expectedVersion: number;
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
};
export type StageCorrection = {
  fromStage: Stage;
  toStage: Stage;
  reason: string;
};

function fail(message: string): never {
  throw new PipelineValidationError(message);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object.`);
  return value as Record<string, unknown>;
}

function onlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  name: string,
) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length)
    fail(`${name} contains unsupported fields: ${extras.join(", ")}.`);
}

function text(value: unknown, name: string, minimum: number, maximum: number) {
  if (typeof value !== "string") fail(`${name} must be text.`);
  const cleaned = value.trim();
  if (cleaned.length < minimum || cleaned.length > maximum)
    fail(`${name} must be ${minimum}-${maximum} characters.`);
  return cleaned;
}

function stage(value: unknown, name: string): Stage {
  if (
    typeof value !== "string" ||
    !(stages as readonly string[]).includes(value)
  )
    fail(`${name} is not a valid application stage.`);
  return value as Stage;
}

function date(value: unknown, name: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(`${name} must be a date in YYYY-MM-DD format.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(`${name} is not a real calendar date.`);
  return value;
}

function instant(value: unknown, name: string) {
  if (
    typeof value !== "string" ||
    !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    Number.isNaN(Date.parse(value))
  )
    fail(`${name} must be an ISO 8601 timestamp with a timezone.`);
  return new Date(value).toISOString();
}

function structuredJob(value: unknown, index: number): ManualStructuredJob {
  const input = record(value, `jobs[${index}]`);
  onlyKeys(
    input,
    ["originalUrl", "company", "title", "description", "requirements"],
    `jobs[${index}]`,
  );
  const originalUrl = text(
    input.originalUrl,
    `jobs[${index}].originalUrl`,
    1,
    5000,
  );
  normalizeSourceUrl(originalUrl);
  if (!Array.isArray(input.requirements) || input.requirements.length > 30)
    fail(`jobs[${index}].requirements must contain at most 30 items.`);
  return {
    originalUrl,
    company: text(input.company, `jobs[${index}].company`, 1, 200),
    title: text(input.title, `jobs[${index}].title`, 1, 200),
    description: text(
      input.description,
      `jobs[${index}].description`,
      20,
      50000,
    ),
    requirements: input.requirements.map((item, requirementIndex) =>
      text(item, `jobs[${index}].requirements[${requirementIndex}]`, 1, 500),
    ),
  };
}

export const uuidSchema: Schema<string> = {
  parse(value) {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      fail("Invalid ID");
    return value;
  },
};

export const manualBatchImportSchema: Schema<ManualBatchImport> = {
  parse(value) {
    const input = record(value, "import");
    onlyKeys(
      input,
      ["adapter", "extractedAt", "extractionVersion", "jobs"],
      "import",
    );
    if (input.adapter !== "manual-structured")
      fail(
        "adapter must be manual-structured. CareerOS does not fetch job pages.",
      );
    if (
      !Array.isArray(input.jobs) ||
      input.jobs.length < 1 ||
      input.jobs.length > 100
    )
      fail("jobs must contain 1-100 structured job records.");
    return {
      adapter: input.adapter,
      extractedAt: instant(input.extractedAt, "extractedAt"),
      extractionVersion: text(
        input.extractionVersion,
        "extractionVersion",
        1,
        100,
      ),
      jobs: input.jobs.map(structuredJob),
    };
  },
};

export const newDecisionSchema: Schema<NewDecision> = {
  parse(value) {
    const input = record(value, "decision");
    onlyKeys(input, ["title", "dueDate"], "decision");
    return {
      title: text(input.title, "title", 1, 500),
      dueDate: date(input.dueDate, "dueDate"),
    };
  },
};

export const updateDecisionSchema: Schema<UpdateDecision> = {
  parse(value) {
    const input = record(value, "decision update");
    onlyKeys(
      input,
      ["expectedVersion", "title", "dueDate", "completed"],
      "decision update",
    );
    if (
      !Number.isInteger(input.expectedVersion) ||
      Number(input.expectedVersion) < 1
    )
      fail("expectedVersion must be a positive integer.");
    if (!("title" in input) && !("dueDate" in input) && !("completed" in input))
      fail("Provide a title, dueDate or completed value to update.");
    if ("completed" in input && typeof input.completed !== "boolean")
      fail("completed must be true or false.");
    const completed = input.completed as boolean | undefined;
    return {
      expectedVersion: Number(input.expectedVersion),
      ...(input.title === undefined
        ? {}
        : { title: text(input.title, "title", 1, 500) }),
      ...(Object.hasOwn(input, "dueDate")
        ? { dueDate: date(input.dueDate, "dueDate") }
        : {}),
      ...(completed === undefined ? {} : { completed }),
    };
  },
};

export const stageCorrectionSchema: Schema<StageCorrection> = {
  parse(value) {
    const input = record(value, "stage correction");
    onlyKeys(input, ["fromStage", "toStage", "reason"], "stage correction");
    const correction = {
      fromStage: stage(input.fromStage, "fromStage"),
      toStage: stage(input.toStage, "toStage"),
      reason: text(input.reason, "reason", 3, 2000),
    };
    if (correction.fromStage === correction.toStage)
      fail("A correction must change the application stage.");
    return correction;
  },
};
