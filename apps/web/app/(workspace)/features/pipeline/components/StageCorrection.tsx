"use client";

import { type FormEvent } from "react";
import { stages, type Stage } from "@careeros/domain";
import { handledMutation } from "../handledMutation";
import { useStageCorrection } from "../usePipeline";

export function StageCorrection({
  jobId,
  stage,
  onChanged,
}: {
  jobId: string;
  stage: Stage;
  onChanged?: () => void;
}) {
  const correction = useStageCorrection(jobId, onChanged);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await handledMutation(
      () =>
        correction.mutateAsync({
          fromStage: stage,
          toStage: String(data.get("toStage")) as Stage,
          reason: String(data.get("reason")),
        }),
      () => form.reset(),
    );
  }

  return (
    <section aria-labelledby="stage-correction-heading">
      <h3 id="stage-correction-heading">Correct the recorded stage</h3>
      <p className="muted">
        Use this when real events arrived out of order. The previous record
        stays in the audit history.
      </p>
      {correction.error && (
        <p className="error" role="alert">
          {correction.error.message}
        </p>
      )}
      {correction.isSuccess && (
        <p className="notice" role="status">
          Stage corrected and audit reason saved.
        </p>
      )}
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Correct stage to
          <select
            name="toStage"
            defaultValue=""
            required
            disabled={correction.isPending}
          >
            <option value="" disabled>
              Select the accurate stage
            </option>
            {stages
              .filter((item) => item !== stage)
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>
        </label>
        <label>
          Audit reason
          <textarea
            name="reason"
            minLength={3}
            maxLength={2000}
            required
            rows={2}
            disabled={correction.isPending}
          />
        </label>
        <button className="secondary" disabled={correction.isPending}>
          {correction.isPending ? "Saving…" : "Save correction"}
        </button>
      </form>
    </section>
  );
}
