"use client";
import { useState } from "react";
import { useJobs } from "../../hooks/use-jobs";
import { useMemory, useMemoryAction } from "../../hooks/use-intelligence";
import { MemoryNote } from "./MemoryNote";
export function MemoryWorkspace() {
  const [scope, setScope] = useState("career-planning"),
    [notice, setNotice] = useState("");
  const { data: jobs = [] } = useJobs(),
    { data, isPending, error, refetch } = useMemory(scope),
    action = useMemoryAction(scope);
  return (
    <section className="card">
      <h2>Your notes</h2>
      <p className="muted">
        Keep useful observations with the role they belong to. Notes stay
        separate from the experience in your profile.
      </p>
      <label>
        Keep notes with
        <select
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setNotice("");
          }}
        >
          <option value="career-planning">General career planning</option>
          {jobs.map((job) => (
            <option key={job.id} value={`job:${job.id}`}>
              {job.company} · {job.title}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Add a note</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              data = new FormData(form),
              expiry = String(data.get("expiresAt") || "");
            action.mutate(
              {
                path: "memory",
                method: "POST",
                data: {
                  scope,
                  content: data.get("content"),
                  sourceId: data.get("sourceId"),
                  expiresAt: expiry
                    ? new Date(expiry).toISOString()
                    : undefined,
                },
              },
              {
                onSuccess: () => {
                  form.reset();
                  setNotice(
                    "Note saved. Review its source before confirming it.",
                  );
                },
              },
            );
          }}
        >
          <label>
            Note
            <textarea name="content" required maxLength={10000} rows={3} />
          </label>
          <label>
            Where this came from
            <input
              name="sourceId"
              required
              maxLength={500}
              placeholder="e.g. Interview notes, 6 September"
            />
          </label>
          <label>
            Optional expiry
            <input name="expiresAt" type="datetime-local" />
          </label>
          <button disabled={action.isPending}>Save note for review</button>
        </form>
      </details>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {(error || action.error) && (
        <p className="error" role="alert">
          {(error || action.error)?.message}{" "}
          <button className="secondary" onClick={() => void refetch()}>
            Refresh
          </button>
        </p>
      )}
      {isPending && <p role="status">Loading notes…</p>}
      {data?.entries.length === 0 && (
        <p className="empty-inline">No active notes here yet.</p>
      )}
      {data?.entries.map((note) => (
        <MemoryNote key={note.id} note={note} scope={scope} />
      ))}
    </section>
  );
}
