"use client";
import { useCvFile } from "../../hooks/use-cv-file";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
import { useState } from "react";
import { OriginalImport } from "./OriginalImport";
export function ImportSource({ workspace, busy, run }: ProfileSectionProps) {
  const [importText, setImportText] = useState("");
  const [sourceKind, setSourceKind] = useState<"paste" | "text" | "json">(
    "paste",
  );
  const [filename, setFilename] = useState("");
  const fileReader = useCvFile();
  return (
    <section className={styles.panel}>
      <h2>Import your CV</h2>
      <p className={styles.muted}>
        Upload your PDF or Word CV, or paste its text. CareerOS extracts the
        text locally for you to review before importing.
      </p>
      <label>
        CV text
        <textarea
          rows={8}
          maxLength={90000}
          value={importText}
          onChange={(event) => {
            setImportText(event.target.value);
            setSourceKind("paste");
            setFilename("");
          }}
          placeholder="Paste your CV text here…"
        />
      </label>
      <label className={styles.file}>
        Or upload your CV
        <input
          type="file"
          accept=".pdf,.docx,.txt,.json"
          disabled={fileReader.reading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void fileReader.read(file).then((result) => {
              if (result) {
                setImportText(result.content);
                setFilename(file.name);
                setSourceKind(result.kind);
              }
            });
          }}
        />
      </label>
      {fileReader.error && (
        <p role="alert" className={styles.inlineError}>
          {fileReader.error}
        </p>
      )}
      {fileReader.reading && <p role="status">Reading your CV…</p>}
      <button
        disabled={busy || fileReader.reading || !importText.trim()}
        onClick={() =>
          void run(
            "profile/imports",
            "POST",
            {
              sourceKind,
              filename: filename || undefined,
              content: importText,
            },
            "CV imported. Discovery can now use its role and skill signals; confirm career claims before preparing applications.",
          ).then((saved) => {
            if (saved) {
              setImportText("");
              setFilename("");
              setSourceKind("paste");
            }
          })
        }
      >
        {busy ? "Importing…" : "Import for review"}
      </button>
      {workspace.imports.length > 0 && (
        <details className={styles.history}>
          <summary>
            Original import history · {workspace.imports.length}
          </summary>
          {workspace.imports.map((item) => (
            <OriginalImport key={item.id} item={item} />
          ))}
        </details>
      )}
    </section>
  );
}
