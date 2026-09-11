"use client";
import { useState } from "react";
import type { MemoryEntry } from "./types";
import { useMemoryAction } from "../../hooks/use-intelligence";
export function MemoryNote({
  note,
  scope,
}: {
  note: MemoryEntry;
  scope: string;
}) {
  const [editing, setEditing] = useState(false),
    action = useMemoryAction(scope);
  return (
    <article className="artifact">
      <h3>{note.verified ? "Confirmed note" : "Needs verification"}</h3>
      <p className="note-text">{note.content}</p>
      <p className="muted criteria">
        Source: {note.sourceId}
        {note.correctionSourceId ? " · Manually corrected" : ""}
        {note.expiresAt
          ? ` · Expires ${new Date(note.expiresAt).toLocaleString()}`
          : " · No expiry"}
      </p>
      {action.error && (
        <p className="error" role="alert">
          {action.error.message}
        </p>
      )}
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            action.mutate(
              {
                path: `memory/${note.id}/correct`,
                method: "PATCH",
                data: {
                  scope,
                  content: data.get("content"),
                  correctionSourceId: data.get("source"),
                },
              },
              { onSuccess: () => setEditing(false) },
            );
          }}
        >
          <label>
            Corrected note
            <textarea
              name="content"
              required
              maxLength={10000}
              rows={3}
              defaultValue={note.content}
            />
          </label>
          <label>
            Correction source
            <input
              name="source"
              required
              maxLength={500}
              defaultValue="My review"
            />
          </label>
          <div className="actions">
            <button disabled={action.isPending}>Save correction</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="actions">
          {!note.verified && (
            <button
              disabled={action.isPending}
              onClick={() =>
                action.mutate({
                  path: `memory/${note.id}/confirm`,
                  method: "PATCH",
                  data: { scope },
                })
              }
            >
              Confirm source
            </button>
          )}
          <button
            className="secondary"
            disabled={action.isPending}
            onClick={() => setEditing(true)}
          >
            Correct
          </button>
          <button
            className="secondary"
            disabled={action.isPending}
            onClick={() => {
              if (window.confirm("Delete this note?"))
                action.mutate({
                  path: `memory/${note.id}?scope=${encodeURIComponent(scope)}`,
                  method: "DELETE",
                });
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
