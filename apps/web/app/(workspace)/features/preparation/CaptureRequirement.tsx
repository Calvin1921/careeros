"use client";
import { useState } from "react";
import { usePreparationActions } from "../../hooks/use-preparation";
import styles from "./preparation.module.css";

export function CaptureRequirement({
  jobId,
  description,
  empty,
}: {
  jobId: string;
  description: string;
  empty: boolean;
}) {
  const { capture } = usePreparationActions(jobId);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <details className={styles.capture} open={empty || undefined}>
      <summary>Add a requirement from this posting</summary>
      <p>
        Copy one requirement exactly from the saved description. Start with the
        skills or responsibilities that matter most for this role.
      </p>
      <details>
        <summary>Read saved job description</summary>
        <p className={styles.description}>{description}</p>
      </details>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setNotice("");
          try {
            await capture.mutateAsync(text);
            setText("");
            setNotice("Requirement added to your preparation list.");
          } catch {
            /* Mutation error is rendered below; preserve the excerpt. */
          }
        }}
      >
        <label>
          Exact requirement excerpt
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            minLength={1}
            maxLength={500}
            rows={3}
          />
        </label>
        <button
          className="secondary"
          disabled={capture.isPending || !text.trim()}
        >
          {capture.isPending ? "Adding…" : "Add requirement"}
        </button>
        {capture.error && (
          <p className="error" role="alert">
            {capture.error.message}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </form>
    </details>
  );
}
