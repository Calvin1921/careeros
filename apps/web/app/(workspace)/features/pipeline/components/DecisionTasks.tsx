"use client";

import { useState, type FormEvent } from "react";
import { handledMutation } from "../handledMutation";
import type { Decision } from "../pipeline.types";
import { useDecisionMutations } from "../usePipeline";
import { DecisionTaskRow } from "./DecisionTaskRow";

export function DecisionTasks({
  jobId,
  decisions,
  onChanged,
}: {
  jobId: string;
  decisions: Decision[];
  onChanged?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const mutations = useDecisionMutations(jobId, onChanged);
  const busy = mutations.create.isPending || mutations.update.isPending;
  const error = mutations.create.error ?? mutations.update.error;

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await handledMutation(
      () =>
        mutations.create.mutateAsync({
          title: String(data.get("title")),
          dueDate: String(data.get("dueDate") || "") || null,
        }),
      () => form.reset(),
    );
  }

  return (
    <section aria-labelledby="decision-tasks-heading">
      <div className="section-title">
        <h2 id="decision-tasks-heading">Tasks & follow-ups</h2>
        <button
          className={adding ? "secondary" : ""}
          onClick={() => setAdding(!adding)}
        >
          {adding ? "Close form" : "Add task"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error.message}
        </p>
      )}
      {decisions.length === 0 && (
        <p className="muted">No open questions recorded for this role.</p>
      )}
      {decisions.map((decision) => (
        <DecisionTaskRow
          key={decision.id}
          decision={decision}
          busy={busy}
          update={mutations.update.mutateAsync}
        />
      ))}
      {adding && (
        <form className="editor-surface" onSubmit={(event) => void add(event)}>
          <label>
            What needs to happen?
            <input name="title" required maxLength={500} disabled={busy} />
          </label>
          <label>
            Follow-up date
            <input name="dueDate" type="date" disabled={busy} />
          </label>
          <button disabled={busy}>
            {mutations.create.isPending ? "Saving…" : "Save task"}
          </button>
        </form>
      )}
    </section>
  );
}
