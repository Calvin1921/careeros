"use client";

import type { ImportDraft } from "../pipeline.types";

export function JobImportRow({
  index,
  job,
  busy,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  job: ImportDraft;
  busy: boolean;
  removable: boolean;
  onChange: (next: ImportDraft) => void;
  onRemove: () => void;
}) {
  function change(field: keyof ImportDraft, value: string) {
    onChange({ ...job, [field]: value });
  }

  return (
    <fieldset className="card import-record">
      <legend>Role {index + 1}</legend>
      <div className="form-grid">
        <label>
          Company
          <input
            required
            maxLength={200}
            disabled={busy}
            value={job.company}
            onChange={(event) => change("company", event.target.value)}
          />
        </label>
        <label>
          Role title
          <input
            required
            maxLength={200}
            disabled={busy}
            value={job.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
      </div>
      <label>
        Application link
        <input
          type="url"
          required
          maxLength={5000}
          disabled={busy}
          value={job.originalUrl}
          onChange={(event) => change("originalUrl", event.target.value)}
        />
      </label>
      <label>
        Job description
        <textarea
          required
          minLength={20}
          maxLength={50000}
          rows={6}
          disabled={busy}
          value={job.description}
          onChange={(event) => change("description", event.target.value)}
        />
      </label>
      <label>
        Requirements
        <small>One per line</small>
        <textarea
          rows={3}
          disabled={busy}
          value={job.requirements}
          onChange={(event) => change("requirements", event.target.value)}
        />
      </label>
      {removable && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onRemove}
        >
          Remove role
        </button>
      )}
    </fieldset>
  );
}
