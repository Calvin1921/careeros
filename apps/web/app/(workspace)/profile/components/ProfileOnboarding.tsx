"use client";
import { useState } from "react";
import type { ProfileSectionProps } from "../types";
import { ImportSource } from "./ImportSource";
import { ManualExperience } from "./ManualExperience";
import { Icon } from "../../components/Icon";
export function ProfileOnboarding(props: ProfileSectionProps) {
  const [choice, setChoice] = useState<"import" | "manual" | null>(null);
  if (choice)
    return (
      <div className="narrow">
        <button
          className="secondary"
          style={{ marginBottom: 20 }}
          onClick={() => setChoice(null)}
        >
          ← Back to choices
        </button>
        {choice === "import" ? (
          <ImportSource {...props} />
        ) : (
          <section className="card">
            <h2>Add your first experience</h2>
            <p className="section-caption">
              Start with one role or project. You can review and confirm it
              after saving.
            </p>
            <ManualExperience busy={props.busy} run={props.run} />
          </section>
        )}
      </div>
    );
  return (
    <section className="card profile-start">
      <div className="profile-start-icon">
        <Icon name="profile" size={30} />
      </div>
      <h2>Let’s start with your experience.</h2>
      <p className="muted">
        Bring in your CV so you don’t have to start from scratch, or add one
        experience yourself. You’ll review everything before it is used.
      </p>
      <div className="actions">
        <button onClick={() => setChoice("import")}>
          Upload or paste my CV →
        </button>
        <button className="secondary" onClick={() => setChoice("manual")}>
          Add experience myself
        </button>
      </div>
      <p className="criteria muted" style={{ marginTop: 20, marginBottom: 0 }}>
        Text and JSON files are supported. For a PDF or Word CV, paste its text
        for now.
      </p>
    </section>
  );
}
