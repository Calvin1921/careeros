"use client";
import type { ProfileSectionProps } from "../types";
import { ImportSource } from "./ImportSource";
import { ExperienceReview } from "./ExperienceReview";
export function ProfileCv(props: ProfileSectionProps) {
  return (
    <>
      <details
        className="card import-disclosure"
        open={props.workspace.experiences.length === 0}
      >
        <summary>
          Import a CV <span className="muted">· PDF, Word or text</span>
        </summary>
        <ImportSource {...props} />
      </details>
      <ExperienceReview {...props} />
    </>
  );
}
