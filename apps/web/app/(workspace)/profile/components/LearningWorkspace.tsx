"use client";
import { useState } from "react";
import { LearningMilestoneForm } from "./LearningMilestoneForm";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
export function LearningWorkspace({
  workspace,
  busy,
  run,
}: ProfileSectionProps) {
  const [adding, setAdding] = useState(false);
  const practicalEvidence = (capabilityId: string) =>
    workspace.capabilities
      .find((item) => item.id === capabilityId)
      ?.evidence.filter(
        (item) => item.verified && item.attested_at && item.kind !== "learning",
      ) ?? [];
  return (
    <section className={styles.panel}>
      <div className="section-title">
        <h2>Your learning plan</h2>
        {workspace.capabilities.length > 0 && (
          <button
            className={adding ? "secondary" : ""}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Close form" : "Add milestone"}
          </button>
        )}
      </div>
      <p className={styles.muted}>
        Set aside time to build something. Link practical evidence when you
        complete it.
      </p>
      {workspace.capabilities.length === 0 ? (
        <p>Add a skill bundle in Skills & evidence to start a learning plan.</p>
      ) : adding ? (
        <div className="editor-surface">
          <LearningMilestoneForm workspace={workspace} busy={busy} run={run} />
        </div>
      ) : null}
      {!workspace.milestones.length && !adding && (
        <p className="empty-inline">
          No milestones yet. Add one focused goal and a realistic weekly time
          budget.
        </p>
      )}
      {workspace.milestones.map((item) => (
        <article className="milestone-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <small>
              {String(item.week_start).slice(0, 10)} · {item.weekly_hours} hours
              · {item.status}
            </small>
            <p>{item.practical_evidence_goal}</p>
          </div>
          <form
            className={styles.milestoneAction}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void run(
                `learning-milestones/${item.id}`,
                "PATCH",
                { status: "completed", evidenceId: data.get("evidenceId") },
                "Milestone completed with practical evidence.",
              );
            }}
          >
            <select
              name="evidenceId"
              aria-label={`Evidence for ${item.title}`}
              defaultValue={item.evidence_id ?? ""}
            >
              <option value="">Choose practical evidence</option>
              {practicalEvidence(item.capability_id).map((evidence) => (
                <option value={evidence.id} key={evidence.id}>
                  {evidence.summary}
                </option>
              ))}
            </select>
            <button className={styles.secondary} disabled={busy}>
              Complete
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
