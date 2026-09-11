"use client";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
import { ManualExperience } from "./ManualExperience";
import { ExperienceEditor } from "./ExperienceEditor";
export function ExperienceReview({
  workspace,
  busy,
  run,
}: ProfileSectionProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.sectionTitle}>
        <h2>Your experience</h2>
        <span>
          {
            workspace.experiences.filter((item) => item.status === "proposed")
              .length
          }{" "}
          need review
        </span>
      </div>
      {workspace.experiences.length === 0 ? (
        <div className={styles.empty}>
          <h3>Your experience belongs here.</h3>
          <p>
            Import a source or add a claim manually. Nothing becomes confirmed
            on import.
          </p>
        </div>
      ) : (
        workspace.experiences.map((item) => (
          <ExperienceEditor
            key={item.id}
            experience={item}
            busy={busy}
            onSave={(data) =>
              run(
                `profile/experiences/${item.id}`,
                "PATCH",
                data,
                "Experience saved.",
              )
            }
          />
        ))
      )}
      <details>
        <summary>Add experience</summary>
        <ManualExperience busy={busy} run={run} />
      </details>
    </section>
  );
}
