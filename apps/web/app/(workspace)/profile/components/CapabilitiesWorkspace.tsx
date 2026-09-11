"use client";
import type { Workspace, ProfileSectionProps } from "../types";
import { lines } from "../types";
import { CapabilityCard } from "./CapabilityCard";
import styles from "../profile.module.css";
type Run = ProfileSectionProps["run"];
export function CapabilitiesWorkspace({
  workspace,
  busy,
  run,
}: {
  workspace: Workspace;
  busy: boolean;
  run: Run;
}) {
  return (
    <div className={styles.capGrid}>
      <section className={styles.panel}>
        <h2>Skills backed by experience</h2>
        <p className={styles.muted}>
          Group the skills you use together and connect the work that
          demonstrates them.
        </p>
        <details open={workspace.capabilities.length === 0}>
          <summary>Add a skill bundle</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget,
                data = new FormData(form);
              void run(
                "capabilities",
                "POST",
                {
                  name: data.get("name"),
                  technologies: lines(data.get("technologies")),
                  transferablePrinciples: lines(data.get("principles")),
                  learningHours: Number(data.get("hours")),
                },
                "Capability bundle created.",
              ).then((saved) => {
                if (saved) form.reset();
              });
            }}
          >
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Technologies <small>One per line</small>
              <textarea name="technologies" required />
            </label>
            <label>
              Transferable principles <small>One per line</small>
              <textarea name="principles" />
            </label>
            <label>
              Learning hours
              <input
                name="hours"
                type="number"
                min="0"
                max="10000"
                defaultValue="0"
              />
            </label>
            <button disabled={busy}>Save skill bundle</button>
          </form>
        </details>
      </section>
      {workspace.capabilities.map((capability) => (
        <CapabilityCard
          key={capability.id}
          capability={capability}
          busy={busy}
          run={run}
        />
      ))}
    </div>
  );
}
