"use client";
import { useState } from "react";
import { stages, canTransition, type Stage } from "@careeros/domain";
import { useJob, useJobActions } from "../../hooks/use-jobs";
type Props = {
  job: NonNullable<ReturnType<typeof useJob>["data"]>;
  stage: ReturnType<typeof useJobActions>["stage"];
};
export function JobStatus({ job, stage }: Props) {
  const [next, setNext] = useState<Stage | "">("");
  return (
    <section className="card status-editor" id="status">
      <h2>Application status</h2>
      <span className="stage" data-stage={job.stage}>
        {job.stage}
      </span>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (next) stage.mutate(next, { onSuccess: () => setNext("") });
        }}
      >
        <p className="muted">Record a change after it happens.</p>
        <label>
          Move to
          <select
            value={next}
            disabled={stage.isPending}
            onChange={(e) => setNext(e.target.value as Stage)}
          >
            <option value="">Choose next stage</option>
            {stages
              .filter((s) => s !== job.stage && canTransition(job.stage, s))
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </label>
        <button className="secondary" disabled={!next || stage.isPending}>
          {stage.isPending ? "Saving…" : "Save status"}
        </button>
      </form>
      {stage.error && (
        <p role="alert" className="error">
          {stage.error.message}
        </p>
      )}
      {stage.isSuccess && <p role="status">Stage updated.</p>}
      <p className="criteria muted">
        Made a mistake? You can correct it in History.
      </p>
    </section>
  );
}
