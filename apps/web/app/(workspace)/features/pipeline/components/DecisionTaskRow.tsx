"use client";

import { useEffect, useState, type FormEvent } from "react";
import { handledMutation } from "../handledMutation";
import { dueLabel, isOverdue } from "../pipeline.presentation";
import type { Decision, DecisionUpdate } from "../pipeline.types";

export function DecisionTaskRow({
  decision,
  busy,
  update,
}: {
  decision: Decision;
  busy: boolean;
  update: (value: DecisionUpdate) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(decision.title);
  const [dueDate, setDueDate] = useState(decision.due_date ?? "");

  useEffect(() => {
    setTitle(decision.title);
    setDueDate(decision.due_date ?? "");
  }, [decision.title, decision.due_date, decision.version]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handledMutation(() =>
      update({
        decisionId: decision.id,
        expectedVersion: decision.version,
        title,
        dueDate: dueDate || null,
      }),
    );
  }

  return (
    <article className="task-record">
      <div className="task-summary">
        <div>
          <strong>{decision.title}</strong>
          <small className={isOverdue(decision) ? "overdue" : "muted"}>
            {dueLabel(decision)}
          </small>
        </div>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              void handledMutation(() =>
                update({
                  decisionId: decision.id,
                  expectedVersion: decision.version,
                  completed: decision.completed_at === null,
                }),
              )
            }
          >
            {decision.completed_at ? "Reopen" : "Complete"}
          </button>
        </div>
      </div>
      {editing && (
        <form onSubmit={save} className="editor-surface">
          <label>
            Decision
            <input
              required
              maxLength={500}
              disabled={busy}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Follow-up date
            <input
              type="date"
              disabled={busy}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <div className="actions">
            <button className="secondary" disabled={busy}>
              Save changes
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
