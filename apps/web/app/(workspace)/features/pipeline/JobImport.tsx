"use client";

import { useState, type FormEvent } from "react";
import { handledMutation } from "./handledMutation";
import { emptyImportDraft, toManualBatchImport } from "./pipeline.presentation";
import type { ImportDraft, ImportResult } from "./pipeline.types";
import { useJobImport } from "./usePipeline";
import { JobImportRow } from "./components/JobImportRow";

export function JobImport({
  onImported,
}: {
  onImported?: (results: ImportResult[]) => void | Promise<void>;
}) {
  const [jobs, setJobs] = useState<ImportDraft[]>([{ ...emptyImportDraft }]);
  const importer = useJobImport();

  function change(index: number, next: ImportDraft) {
    setJobs((current) =>
      current.map((job, jobIndex) => (jobIndex === index ? next : job)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handledMutation(
      () => importer.mutateAsync(toManualBatchImport(jobs)),
      async (response) => {
        setJobs([{ ...emptyImportDraft }]);
        await onImported?.(response.results);
      },
    );
  }

  const created = importer.data?.results.filter(
    (result) => result.status === "created",
  ).length;
  const duplicates = importer.data
    ? importer.data.results.length - created!
    : 0;

  return (
    <section aria-labelledby="job-import-heading">
      <h2 id="job-import-heading">Import job records</h2>
      <p className="muted">
        Add the details from each posting. Links are saved for reference;
        descriptions must be supplied here.
      </p>
      {importer.error && (
        <p className="error" role="alert">
          {importer.error.message}
        </p>
      )}
      {importer.isSuccess && (
        <p className="notice" role="status">
          {created} {created === 1 ? "role" : "roles"} imported
          {duplicates
            ? `; ${duplicates} already saved and linked to a source snapshot.`
            : "."}
        </p>
      )}
      <form onSubmit={(event) => void submit(event)}>
        {jobs.map((job, index) => (
          <JobImportRow
            key={index}
            index={index}
            job={job}
            busy={importer.isPending}
            removable={jobs.length > 1}
            onChange={(next) => change(index, next)}
            onRemove={() =>
              setJobs((current) =>
                current.filter((_, jobIndex) => jobIndex !== index),
              )
            }
          />
        ))}
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={importer.isPending || jobs.length >= 100}
            onClick={() =>
              setJobs((current) => [...current, { ...emptyImportDraft }])
            }
          >
            Add another role
          </button>
          <button disabled={importer.isPending}>
            {importer.isPending
              ? "Importing…"
              : `Import ${jobs.length === 1 ? "role" : `${jobs.length} roles`}`}
          </button>
        </div>
      </form>
    </section>
  );
}
