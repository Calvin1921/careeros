"use client";
import { useEffect, useState } from "react";
import type { Experience } from "../types";
import { lines } from "../types";
import styles from "../profile.module.css";

export function ExperienceEditor({
  experience,
  busy,
  onSave,
}: {
  experience: Experience;
  busy: boolean;
  onSave: (data: unknown) => Promise<unknown>;
}) {
  const [attested, setAttested] = useState(false);
  useEffect(() => {
    const id = `claim-${experience.id}`;
    if (window.location.hash === `#${id}`) {
      const record = document.getElementById(id) as HTMLDetailsElement | null;
      if (record) {
        record.open = true;
        record.scrollIntoView();
      }
    }
  }, [experience.id]);
  return (
    <details id={`claim-${experience.id}`} className={styles.record}>
      <summary>
        <span>
          <strong>
            {experience.roleTitle ||
              experience.employer ||
              experience.summary.slice(0, 70)}
          </strong>
          <small
            className={
              experience.status === "confirmed"
                ? styles.confirmed
                : styles.proposed
            }
          >
            {experience.status}
          </small>
        </span>
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void onSave({
            kind: data.get("kind"),
            employer: data.get("employer"),
            roleTitle: data.get("roleTitle"),
            startDate: data.get("startDate"),
            endDate: data.get("endDate"),
            location: data.get("location"),
            summary: data.get("summary"),
            unresolvedQuestions: lines(data.get("questions")),
            attested,
          });
        }}
      >
        <div className={styles.twoCol}>
          <label>
            Type
            <select name="kind" defaultValue={experience.kind}>
              <option value="experience">Work experience</option>
              <option value="project">Project</option>
              <option value="education">Education</option>
              <option value="certification">Certification</option>
              <option value="other">Other source line</option>
            </select>
          </label>
          <label>
            Organization
            <input name="employer" defaultValue={experience.employer} />
          </label>
          <label>
            Role or title
            <input name="roleTitle" defaultValue={experience.roleTitle} />
          </label>
          <label>
            Location
            <input name="location" defaultValue={experience.location} />
          </label>
          <label>
            Start date <small>User-entered text; no date is inferred.</small>
            <input name="startDate" defaultValue={experience.startDate} />
          </label>
          <label>
            End date{" "}
            <small>User-entered text; use “Present” if accurate.</small>
            <input name="endDate" defaultValue={experience.endDate} />
          </label>
        </div>
        <label>
          Claim or description
          <textarea
            name="summary"
            rows={4}
            required
            minLength={5}
            defaultValue={experience.summary}
          />
        </label>
        <label>
          Questions to resolve{" "}
          <small>One per line. Clear every question before confirmation.</small>
          <textarea
            name="questions"
            rows={2}
            defaultValue={experience.unresolvedQuestions.join("\n")}
          />
        </label>
        <div className={styles.sourceBox}>
          <strong>Source reference</strong>
          {experience.sourceRefs.map((ref, index) => (
            <p key={index}>
              {ref.line
                ? `Line ${ref.line}: `
                : ref.path
                  ? `${ref.path}: `
                  : ""}
              {ref.quote ?? "Entered directly by you"}
            </p>
          ))}
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
          />
          <span>
            I confirm this experience is accurate and supported by the source.
          </span>
        </label>
        <button disabled={busy}>
          {busy
            ? "Saving…"
            : attested
              ? "Save and confirm"
              : "Save as proposal"}
        </button>
      </form>
    </details>
  );
}
