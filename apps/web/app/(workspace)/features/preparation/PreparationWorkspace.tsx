"use client";
import { useCallback, useEffect, useState } from "react";
import { usePreparation } from "../../hooks/use-preparation";
import { CaptureRequirement } from "./CaptureRequirement";
import { RequirementEditor } from "./RequirementEditor";
import {
  browserDraftStorage,
  clearPreparationDraft,
  readSelectedRequirement,
  writeSelectedRequirement,
} from "./preparation-draft";
import { reviewLabels } from "./types";
import styles from "./preparation.module.css";

export function PreparationWorkspace({
  jobId,
  description,
}: {
  jobId: string;
  description: string;
}) {
  const query = usePreparation(jobId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const handleDirty = useCallback((nextDirty: boolean) => {
    setDirty(nextDirty);
    if (nextDirty) setNotice("");
  }, []);
  useEffect(() => {
    const requirements = query.data?.requirements;
    if (!requirements?.length) return;
    const storage = browserDraftStorage();
    const remembered = readSelectedRequirement(storage, jobId);
    const next = requirements.some((item) => item.key === remembered)
      ? remembered!
      : requirements[0]!.key;
    setSelectedKey(next);
    writeSelectedRequirement(storage, jobId, next);
  }, [jobId, query.data?.requirements]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (query.isPending)
    return <p role="status">Loading requirements and preparation…</p>;
  if (!query.data)
    return (
      <div role="alert" className="error">
        {query.error?.message || "Could not load preparation."}{" "}
        <button onClick={() => void query.refetch()}>Retry</button>
      </div>
    );
  const { requirements, summary } = query.data;
  const selected =
    requirements.find((item) => item.key === selectedKey) ?? requirements[0];
  async function reload() {
    if (
      dirty &&
      !window.confirm(
        "Discard your unsaved review and practice answer, and load the saved version?",
      )
    )
      return;
    if (selected)
      clearPreparationDraft(browserDraftStorage(), jobId, selected.key);
    setDirty(false);
    const result = await query.refetch();
    if (!result.error) {
      setReloadKey((value) => value + 1);
      setNotice("");
    }
  }
  return (
    <section className={styles.workspace} aria-labelledby="preparation-heading">
      <div className={styles.heading}>
        <div>
          <h2 id="preparation-heading">
            Turn requirements into a preparation plan
          </h2>
          <p>
            Start with what the role asks for. Connect your evidence, work on
            gaps, and rehearse a clear explanation.
          </p>
        </div>
        <p className={styles.progress} aria-label="Saved preparation progress">
          {summary.reviewed}/{summary.total} reviewed · {summary.practiced}{" "}
          practiced · {summary.ready} self-rated ready
        </p>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {query.error && (
        <p role="alert" className="error">
          {query.error.message} Showing the last loaded version; your open draft
          is preserved.
        </p>
      )}
      {!requirements.length && (
        <p className="empty-inline">
          This posting has no captured requirements yet. Add a relevant excerpt
          below to begin.
        </p>
      )}
      {selected && (
        <div className={styles.workbench}>
          <nav
            className={styles.requirementList}
            aria-label="Requirements to prepare"
          >
            <h3>Study list</h3>
            <ol>
              {requirements.map((item) => (
                <li key={item.key}>
                  <button
                    className={styles.requirementButton}
                    aria-current={
                      item.key === selected.key ? "true" : undefined
                    }
                    onClick={() => {
                      if (item.key === selected.key) return;
                      if (
                        dirty &&
                        !window.confirm(
                          "Discard your unsaved changes and open another requirement?",
                        )
                      )
                        return;
                      clearPreparationDraft(
                        browserDraftStorage(),
                        jobId,
                        selected.key,
                      );
                      setSelectedKey(item.key);
                      writeSelectedRequirement(
                        browserDraftStorage(),
                        jobId,
                        item.key,
                      );
                      setNotice("");
                    }}
                  >
                    <span>{item.text}</span>
                    <small>
                      {reviewLabels[item.review.status]}
                      {item.review.response.trim() ? " · Practiced" : ""}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <RequirementEditor
            key={`${selected.key}:${reloadKey}`}
            jobId={jobId}
            requirement={selected}
            onDirty={handleDirty}
            onSaved={() => {
              setReloadKey((value) => value + 1);
              setNotice(
                "Review and practice saved. Your preparation progress is up to date.",
              );
            }}
            onReload={() => void reload()}
          />
        </div>
      )}
      <CaptureRequirement
        jobId={jobId}
        description={description}
        empty={!requirements.length}
      />
    </section>
  );
}
