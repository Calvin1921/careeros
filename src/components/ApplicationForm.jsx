import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { safeEmployerUrl } from "../lib/live-api";

export function ApplicationForm({
  job = {},
  answer,
  setAnswer,
  onBack,
  onHelp,
  submitted,
  onSubmit,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [employerOpened, setEmployerOpened] = useState(false);
  const materials = Array.isArray(job.materials)
    ? job.materials
    : ["Tailored CV", "Employer application form"];
  const question = job.question || "Why are you interested in this role?";
  const employerUrl = safeEmployerUrl(job.url);
  if (submitted)
    return (
      <section className="application-form success">
        <div className="application-form__content">
          <CheckCircle size={52} weight="light" />
          <h1>Added to your application tracker.</h1>
          <p>
            CareerOS recorded the status locally. Nothing was submitted to the
            employer.
          </p>
          <button className="secondary" onClick={onBack}>
            Review your package
          </button>
        </div>
      </section>
    );
  return (
    <section className="application-form">
      <div className="application-form__content">
        <p className="eyebrow">Application handoff</p>
        <h1>Everything you need to apply</h1>
        <p className="muted">
          Download the tailored CV, review the application answer, then continue
          to the employer.
        </p>
        <section className="handoff-note">
          <h2>Employer submission</h2>
          <p>
            CareerOS prepares the material and keeps the record. You review and
            submit on the employer’s page.
          </p>
          {employerUrl ? (
            <a
              className="primary application-employer-link"
              href={employerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setEmployerOpened(true)}
            >
              {employerOpened
                ? "Employer page opened"
                : "Open employer application"}{" "}
              <ArrowUpRight size={18} />
            </a>
          ) : (
            <p className="application-handoff-missing">
              <WarningCircle size={17} /> An employer application link was not
              captured for this role. Recheck the original source before marking
              it applied.
            </p>
          )}
        </section>
        <section className="application-form__section">
          <h2>Before you leave</h2>
          <ul className="material-list">
            {materials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <label>
          {question}
          <span className="application-question-source">
            {job.questionSource ||
              "Confirm the employer’s exact wording on the application page"}
          </span>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Draft your answer or ask CareerOS for help."
          />
        </label>
        <button className="text-button" onClick={onHelp}>
          Help me answer this question
        </button>
        <label className="application-submit-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />{" "}
          <span>I submitted this application on the employer’s page.</span>
        </label>
        <div className="button-row">
          <button className="secondary" onClick={onBack}>
            Review package
          </button>
          <button
            className="secondary"
            onClick={onSubmit}
            disabled={!confirmed}
          >
            Record as applied
          </button>
        </div>
        <p className="fine">
          CareerOS records your status after you confirm submission. It does not
          submit applications for you.
        </p>
      </div>
    </section>
  );
}
