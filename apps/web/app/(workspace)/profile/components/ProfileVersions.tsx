"use client";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
import { useState } from "react";
export function ProfileVersions({ workspace, busy, run }: ProfileSectionProps) {
  const profile = workspace.profile;
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const attestedEvidence = workspace.capabilities
    .flatMap((capability) =>
      capability.evidence.map((item) => ({ capability, item })),
    )
    .filter(({ item }) => item.verified && item.attested_at);
  return (
    <section className={styles.panel}>
      <h2>Save a profile version</h2>
      <p className={styles.muted}>
        The snapshot includes confirmed experiences and only the attested
        evidence selected here. Later edits never change an older version.
      </p>
      <div className={styles.evidencePicker}>
        {attestedEvidence.map(({ capability, item }) => (
          <label className={styles.check} key={item.id}>
            <input
              type="checkbox"
              checked={selectedEvidence.includes(item.id)}
              onChange={(event) =>
                setSelectedEvidence((current) =>
                  event.target.checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id),
                )
              }
            />
            <span>
              <strong>
                {capability.name} · {item.kind}
              </strong>
              <small>{item.summary}</small>
            </span>
          </label>
        ))}
      </div>
      {(!profile?.full_name ||
        !workspace.experiences.some((item) => item.status === "confirmed")) && (
        <p className="notice">
          Add your name in Personal details and confirm at least one experience
          before saving a version.
        </p>
      )}
      <button
        disabled={
          busy ||
          !profile?.full_name ||
          !workspace.experiences.some((item) => item.status === "confirmed")
        }
        onClick={() =>
          void run(
            "profile/versions",
            "POST",
            { selectedEvidenceIds: selectedEvidence },
            "Confirmed profile version saved.",
          )
        }
      >
        Create confirmed version
      </button>
      {workspace.versions.length > 0 && (
        <div className={styles.versions}>
          {workspace.versions.map((version) => (
            <details key={version.id}>
              <summary>
                <strong>Version {version.versionNumber}</strong> ·{" "}
                {version.experienceSnapshot.length} claims ·{" "}
                {version.evidenceSnapshot.length} evidence sources
              </summary>
              <small>{new Date(version.createdAt).toLocaleString()}</small>
              <h4>Confirmed claims</h4>
              <ul>
                {version.experienceSnapshot.map((claim) => (
                  <li key={claim.id}>{claim.summary}</li>
                ))}
              </ul>
              <h4>Selected evidence</h4>
              {version.evidenceSnapshot.length ? (
                <ul>
                  {version.evidenceSnapshot.map((evidence) => (
                    <li key={evidence.id}>
                      <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {evidence.capabilityName}: {evidence.summary}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>
                  No evidence was selected for this version.
                </p>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
