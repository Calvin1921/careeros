import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { recommendCv } from "../lib/cv-recommendation";
import { applicationReadiness } from "../lib/application-readiness";
import "./cv-readiness.css";

export function CvReadiness({ cv, job }) {
  const base = recommendCv(job || {});
  const readiness = applicationReadiness(job || {});
  const evidenceBlocked = readiness.kind === "evidence-gap";
  const checks = [
    [
      "Reverse chronological",
      "Fictional experience in reverse chronological order",
    ],
    [
      "Machine-readable structure",
      "Single column, standard headings and selectable text",
    ],
    [
      "Complete identity block",
      "Fictional identity and reserved example contact details",
    ],
    [
      "Evidence over keywords",
      "Scope and outcomes remain attached to each role",
    ],
  ];
  return (
    <section
      className="cv-readiness"
      aria-labelledby={
        job ? "cv-readiness-title" : "profile-cv-readiness-title"
      }
    >
      <div className="cv-readiness__heading">
        <div>
          <p className="briefing-label">CV quality gate</p>
          <h2 id={job ? "cv-readiness-title" : "profile-cv-readiness-title"}>
            ATS-safe structure
          </h2>
        </div>
        <span
          className={
            evidenceBlocked
              ? "cv-readiness__state cv-readiness__state--blocked"
              : "cv-readiness__state"
          }
        >
          {evidenceBlocked ? (
            <WarningCircle size={15} />
          ) : (
            <CheckCircle size={15} weight="fill" />
          )}
          {evidenceBlocked ? "Evidence gap" : "Structure checked"}
        </span>
      </div>
      <ul>
        {checks.map(([title, detail]) => (
          <li key={title}>
            <CheckCircle size={17} weight="fill" />
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {job && (
        <div className="cv-readiness__base">
          <div>
            <strong>Recommended regional base</strong>
            <p>{base.label} ATS resume</p>
          </div>
          <a href={base.url} download>
            Download ATS PDF
          </a>
        </div>
      )}
      {evidenceBlocked && (
        <p className="cv-readiness__block">
          <WarningCircle size={16} /> This role needs evidence that is not in
          the supplied CV. A clean document cannot make that evidence true.
        </p>
      )}
      <p className="cv-readiness__limit">
        <WarningCircle size={16} /> No layout can guarantee acceptance by every
        ATS. This gate prevents common parsing failures; you still review truth,
        dates and role-specific wording.
      </p>
    </section>
  );
}
