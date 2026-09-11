"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePreparationActions } from "../../hooks/use-preparation";
import {
  reviewLabels,
  type PreparationRequirement,
  type ReviewStatus,
  type SelfRating,
} from "./types";
import {
  browserDraftStorage,
  clearPreparationDraft,
  createPreparationDraft,
  readPreparationDraft,
  recoverPreparationRequirement,
  writePreparationDraft,
} from "./preparation-draft";
import styles from "./preparation.module.css";

export function RequirementEditor({
  jobId,
  requirement,
  onDirty,
  onSaved,
  onReload,
}: {
  jobId: string;
  requirement: PreparationRequirement;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
  onReload: () => void;
}) {
  // Keep the evidence the user actually saw until an explicit save or reload.
  const [openedRequirement, setOpenedRequirement] = useState(requirement);
  const { review, evidenceOptions } = openedRequirement;
  const { tasks } = requirement;
  const { save, schedule } = usePreparationActions(jobId);
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [evidenceId, setEvidenceId] = useState(review.evidenceId ?? "");
  const [notes, setNotes] = useState(review.notes);
  const [response, setResponse] = useState(review.response);
  const [selfRating, setSelfRating] = useState<SelfRating>(review.selfRating);
  const [dueDate, setDueDate] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const supported = status === "direct" || status === "transferable";
  const evidence = evidenceOptions.find((item) => item.id === evidenceId);
  const dirty =
    status !== review.status ||
    (supported ? evidenceId || null : null) !== review.evidenceId ||
    notes !== review.notes ||
    response !== review.response ||
    selfRating !== review.selfRating;
  useEffect(() => {
    const storage = browserDraftStorage();
    const draft = readPreparationDraft(storage, jobId, requirement.key);
    if (draft && draft.requirementText === requirement.text) {
      setOpenedRequirement(recoverPreparationRequirement(requirement, draft));
      setStatus(draft.fields.status);
      setEvidenceId(draft.fields.evidenceId);
      setNotes(draft.fields.notes);
      setResponse(draft.fields.response);
      setSelfRating(draft.fields.selfRating);
      setRecoveredDraft(true);
    } else if (draft) {
      clearPreparationDraft(storage, jobId, requirement.key);
    }
    setDraftReady(true);
  }, [jobId, requirement.key]);
  useEffect(() => {
    if (!draftReady) return;
    const storage = browserDraftStorage();
    if (!dirty) {
      clearPreparationDraft(storage, jobId, openedRequirement.key);
      return;
    }
    writePreparationDraft(
      storage,
      createPreparationDraft(jobId, openedRequirement, {
        status,
        evidenceId,
        notes,
        response,
        selfRating,
      }),
    );
  }, [
    draftReady,
    dirty,
    evidenceId,
    jobId,
    notes,
    openedRequirement,
    response,
    selfRating,
    status,
  ]);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);

  return (
    <div className={styles.editor}>
      {recoveredDraft && dirty && (
        <p role="status" className="notice">
          Recovered your unsaved session draft. Review and save it when ready.
        </p>
      )}
      <form
        className={styles.reviewForm}
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await save.mutateAsync({
              key: openedRequirement.key,
              expectedVersion: review.version,
              expectedEvidenceSignature: supported
                ? (evidence?.signature ?? null)
                : null,
              status,
              evidenceId: supported ? evidenceId : null,
              notes,
              response,
              selfRating,
            });
            clearPreparationDraft(
              browserDraftStorage(),
              jobId,
              openedRequirement.key,
            );
            onSaved();
          } catch {
            /* Keep the draft on validation or version conflict. */
          }
        }}
      >
        <div className={styles.evidencePane}>
          <h3>Review your evidence</h3>
          <blockquote>{requirement.text}</blockquote>
          {review.invalidatedReason && (
            <p className="error" role="alert">
              {review.invalidatedReason} Choose current evidence and save again.
            </p>
          )}
          <label>
            How does your experience relate?
            <select
              value={status}
              onChange={(event) => {
                const next = event.target.value as ReviewStatus;
                setStatus(next);
                if (next === "gap" || next === "unknown") setEvidenceId("");
              }}
            >
              {Object.entries(reviewLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {supported && (
            <>
              <label>
                Supporting evidence
                <select
                  required
                  value={evidenceId}
                  onChange={(event) => setEvidenceId(event.target.value)}
                >
                  <option value="">Choose attested evidence</option>
                  {evidenceOptions.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.capabilityName} · {item.kind} · {item.summary}
                    </option>
                  ))}
                </select>
              </label>
              {!evidenceOptions.length && (
                <p>
                  No attested evidence yet.{" "}
                  <Link href="/profile#capabilities">
                    Add and confirm skills evidence
                  </Link>
                  , then reload this review.
                </p>
              )}
            </>
          )}
          {supported && evidence && (
            <div className={styles.source}>
              <strong>
                {evidence.capabilityName} · {evidence.kind}
              </strong>
              <p>{evidence.summary}</p>
              <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                {evidence.sourceLabel || "View evidence source"}
              </a>
            </div>
          )}
          <p className={styles.hint}>
            {status === "gap"
              ? "A gap is a focus for preparation. It does not automatically rule you out of the role."
              : status === "transferable"
                ? "Explain what carries over and what still needs practice. A related project does not establish production experience."
                : "Only you confirm whether evidence supports this requirement. Learning, project and production evidence retain their original meaning."}
          </p>
          <label>
            {status === "gap"
              ? "What will you work on?"
              : "Your reasoning or open questions"}
            <textarea
              rows={4}
              maxLength={3000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.practicePane}>
          <h3>Practice your explanation</h3>
          <p>How would you demonstrate this requirement in an interview?</p>
          <ul className={styles.prompts}>
            <li>Describe a relevant situation and your own contribution.</li>
            <li>Explain your approach, trade-offs and what you learned.</li>
            <li>
              Be clear about what you have done and what you still need to
              learn.
            </li>
          </ul>
          <label>
            Your practice answer
            <small>
              Private preparation notes. Unsaved changes remain in this browser
              session until you save or discard them; no AI assessment or code
              execution.
            </small>
            <textarea
              rows={10}
              maxLength={10000}
              value={response}
              onChange={(event) => {
                setResponse(event.target.value);
                if (!event.target.value.trim()) setSelfRating(null);
              }}
            />
          </label>
          <label>
            How did that attempt feel?
            <select
              value={selfRating ?? ""}
              disabled={!response.trim()}
              onChange={(event) =>
                setSelfRating((event.target.value || null) as SelfRating)
              }
            >
              <option value="">Not rated yet</option>
              <option value="needs-work">Needs another attempt</option>
              <option value="ready">Ready to explain</option>
            </select>
          </label>
          <p className={styles.hint}>
            This is your self-assessment. It does not verify a skill or change
            your application stage.
          </p>
        </div>
        <div className={styles.saveBar}>
          <button
            disabled={save.isPending || !dirty || (supported && !evidenceId)}
          >
            {save.isPending ? "Saving…" : "Save review & practice"}
          </button>
          <span role="status">
            {dirty
              ? "Unsaved changes"
              : review.version
                ? "Saved"
                : "No review saved yet"}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={onReload}
            disabled={save.isPending}
          >
            {dirty ? "Discard changes & reload" : "Reload evidence"}
          </button>
          {save.error && (
            <p className="error" role="alert">
              {save.error.message} Your draft is still here. Copy it before
              reloading if you need to keep it.
            </p>
          )}
        </div>
      </form>
      <div className={styles.taskPane}>
        <h3>Make time for the next step</h3>
        <p>
          Add a dated preparation task. It will appear in this application’s
          Tasks and your Today queue when due.
        </p>
        <form
          className={styles.taskForm}
          onSubmit={async (event) => {
            event.preventDefault();
            setTaskNotice("");
            try {
              await schedule.mutateAsync({ key: requirement.key, dueDate });
              setTaskNotice(
                "Preparation task tracked. Open Tasks to edit it or mark it complete.",
              );
            } catch {
              /* Preserve date for retry. */
            }
          }}
        >
          <label>
            Preparation date
            <input
              type="date"
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <button className="secondary" disabled={schedule.isPending}>
            {schedule.isPending ? "Adding…" : "Add preparation task"}
          </button>
        </form>
        {schedule.error && (
          <p role="alert" className="error">
            {schedule.error.message}
          </p>
        )}
        {taskNotice && (
          <p role="status" className="notice">
            {taskNotice}
          </p>
        )}
        {tasks.length > 0 && (
          <ul className={styles.taskList}>
            {tasks.map((task) => (
              <li key={task.id}>
                {task.completedAt ? "Completed" : "Planned"} · {task.dueDate} ·{" "}
                <a href="#tasks">Open Tasks</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
