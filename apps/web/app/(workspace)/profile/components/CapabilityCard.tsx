"use client";
import type { Capability, ProfileSectionProps } from "../types";
import { lines } from "../types";
import { EvidenceEditor } from "./EvidenceEditor";
import styles from "../profile.module.css";
type Run = ProfileSectionProps["run"];
export function CapabilityCard({
  capability,
  busy,
  run,
}: {
  capability: Capability;
  busy: boolean;
  run: Run;
}) {
  return (
    <article className={styles.capability}>
      <div className={styles.capHeader}>
        <div>
          <p className={styles.eyebrow}></p>
          <h3>{capability.name}</h3>
        </div>
        <span className={styles.level}>{capability.readiness.claimLevel}</span>
      </div>
      <div className={styles.dimensions}>
        <span data-ready={capability.readiness.knowledge}>Knowledge</span>
        <span data-ready={capability.readiness.practice}>Practice</span>
        <span data-ready={capability.readiness.production}>Production</span>
      </div>
      <details>
        <summary>Edit skills</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              `capabilities/${capability.id}`,
              "PATCH",
              {
                name: data.get("name"),
                technologies: lines(data.get("technologies")),
                transferablePrinciples: lines(data.get("principles")),
                learningHours: Number(data.get("hours")),
              },
              "Capability updated.",
            );
          }}
        >
          <label>
            Name
            <input name="name" required defaultValue={capability.name} />
          </label>
          <label>
            Technologies <small>One per line</small>
            <textarea
              name="technologies"
              required
              defaultValue={capability.technologies.join("\n")}
            />
          </label>
          <label>
            Transferable principles <small>One per line</small>
            <textarea
              name="principles"
              defaultValue={capability.transferable_principles.join("\n")}
            />
          </label>
          <label>
            Learning hours
            <input
              name="hours"
              type="number"
              min="0"
              max="10000"
              defaultValue={capability.learning_hours}
            />
          </label>
          <button disabled={busy}>Save bundle</button>
        </form>
      </details>
      <h4>Evidence</h4>
      {capability.evidence.length === 0 ? (
        <p className={styles.muted}>
          No evidence yet. Add a source before making a claim.
        </p>
      ) : (
        capability.evidence.map((item) => (
          <EvidenceEditor
            key={item.id}
            item={item}
            busy={busy}
            onSave={(data) =>
              run(
                `evidence/${item.id}`,
                "PATCH",
                data,
                "Evidence updated. Claim readiness recalculated.",
              )
            }
          />
        ))
      )}
      <details>
        <summary>Add evidence</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget,
              data = new FormData(form);
            void run(
              "evidence",
              "POST",
              {
                capabilityId: capability.id,
                kind: data.get("kind"),
                summary: data.get("summary"),
                sourceUrl: data.get("sourceUrl"),
                sourceLabel: data.get("sourceLabel"),
                verified: false,
              },
              "Evidence added as a draft.",
            ).then((saved) => {
              if (saved) form.reset();
            });
          }}
        >
          <label>
            Dimension
            <select name="kind">
              <option value="learning">Knowledge · learning</option>
              <option value="project">Practice · project</option>
              <option value="production">
                Production · paid/operational use
              </option>
            </select>
          </label>
          <label>
            What this proves
            <textarea name="summary" required minLength={5} />
          </label>
          <label>
            Source label
            <input name="sourceLabel" />
          </label>
          <label>
            Source URL
            <input
              name="sourceUrl"
              type="url"
              required
              placeholder="https://…"
            />
          </label>
          <button disabled={busy}>Add draft evidence</button>
        </form>
      </details>
    </article>
  );
}
