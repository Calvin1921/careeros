"use client";
import { useState } from "react";
import type { Evidence } from "../types";
import styles from "../profile.module.css";

export function EvidenceEditor({
  item,
  busy,
  onSave,
}: {
  item: Evidence;
  busy: boolean;
  onSave: (data: unknown) => Promise<unknown>;
}) {
  const [attested, setAttested] = useState(false);
  return (
    <details className={styles.evidence}>
      <summary>
        <span>{item.summary}</span>
        <small
          className={
            item.verified && item.attested_at
              ? styles.confirmed
              : styles.proposed
          }
        >
          {item.verified && item.attested_at ? "attested" : "draft"}
        </small>
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void onSave({
            kind: data.get("kind"),
            summary: data.get("summary"),
            sourceUrl: data.get("sourceUrl"),
            sourceLabel: data.get("sourceLabel"),
            attested,
          });
        }}
      >
        <label>
          Evidence dimension
          <select name="kind" defaultValue={item.kind}>
            <option value="learning">Knowledge · learning</option>
            <option value="project">Practice · project</option>
            <option value="production">
              Production · paid/operational use
            </option>
          </select>
        </label>
        <label>
          What this proves
          <textarea
            name="summary"
            required
            minLength={5}
            defaultValue={item.summary}
          />
        </label>
        <label>
          Source label
          <input name="sourceLabel" defaultValue={item.source_label} />
        </label>
        <label>
          Source URL
          <input
            name="sourceUrl"
            type="url"
            required
            defaultValue={item.source_url}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
          />
          <span>
            I attest this source and evidence description are accurate.
          </span>
        </label>
        <p className={styles.hint}>
          Saving edits without a fresh attestation returns this evidence to
          draft.
        </p>
        <button disabled={busy}>
          {busy ? "Saving…" : attested ? "Save and confirm" : "Save as draft"}
        </button>
      </form>
    </details>
  );
}
