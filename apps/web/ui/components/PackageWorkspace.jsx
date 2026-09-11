import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChatCircle,
  CheckCircle,
  DownloadSimple,
  FilePdf,
  FilePlus,
  PencilSimple,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { CvViewer } from "./CvViewer";
import { CvReadiness } from "./CvReadiness";
import { downloadCv } from "../lib/export-cv";
import { applicationReadiness } from "../lib/application-readiness";

function filePart(value = "") {
  return (
    String(value)
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "Role"
  );
}

export function PackageWorkspace({
  job = {},
  cv,
  onEdit,
  onContinue,
  onHelp,
  checked = [],
  onCheck,
}) {
  const [format, setFormat] = useState("PDF");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const company = job.company || "Company";
  const title = job.title || "Your next role";
  const filename = `${filePart(cv?.name || "CV")}_${filePart(company)}_tailored.${format.toLowerCase()}`;
  const materials = Array.isArray(job.materials) ? job.materials : [];
  const gaps = Array.isArray(job.gaps) ? job.gaps : [];
  const readiness = applicationReadiness(job);
  const packageMaterials = materials.filter(
    (item) => !/tailored cv|employer application form/i.test(item),
  );
  const checks = ["Review tailored CV for accuracy", ...packageMaterials];
  const complete = checks.every((item) => checked.includes(item));
  const evidenceBlocked = readiness.kind === "evidence-gap";

  async function download() {
    setBusy(true);
    setMessage("");
    try {
      await downloadCv(cv, format, company);
      setMessage(`Tailored ${format} downloaded. Review before use.`);
    } catch {
      setMessage("The export could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace">
      <CvViewer cv={cv} />
      <section className="application-kit" aria-labelledby="package-title">
        <div className="ready-icon">
          <FilePlus size={35} weight="light" />
        </div>
        <h1 id="package-title">Prepare a grounded application</h1>
        <p className="tailored-for">
          For {company}
          <br />
          <span className="fine">
            The draft only reframes supplied CV facts. Review it before use.
          </span>
        </p>
        <button
          className="filename"
          onClick={onEdit}
          type="button"
          aria-label="Edit tailored CV"
        >
          <FilePdf size={26} className="pdf-icon" />
          <strong title={filename}>{filename}</strong>
          <PencilSimple size={18} />
        </button>
        <CvReadiness cv={cv} job={job} />
        <div className="format-row">
          <span>Export as</span>
          <div
            className="format-picker"
            role="group"
            aria-label="Export format"
          >
            {["PDF", "DOCX"].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={format === option}
                onClick={() => setFormat(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <section
          className={
            evidenceBlocked
              ? "package-readiness package-readiness--blocked"
              : "package-readiness"
          }
          aria-label="Preparation readiness"
        >
          {evidenceBlocked ? (
            <WarningCircle size={19} />
          ) : (
            <CheckCircle size={19} weight="fill" />
          )}
          <div>
            <strong>
              {evidenceBlocked
                ? "Preparation is blocked by an evidence gap"
                : complete
                  ? "Preparation checks complete"
                  : "Finish preparation checks"}
            </strong>
            <p>
              {evidenceBlocked
                ? readiness.body
                : complete
                  ? "You can move to the employer handoff and submit there when ready."
                  : "Review the CV and each required item before opening the employer application."}
            </p>
          </div>
        </section>
        <button
          className="primary continue"
          type="button"
          onClick={onContinue}
          disabled={evidenceBlocked || !complete}
        >
          {evidenceBlocked
            ? "Build evidence before applying"
            : complete
              ? "Continue to employer handoff"
              : "Complete checks to continue"}{" "}
          <ArrowRight size={22} />
        </button>
        <button
          className="secondary download"
          type="button"
          disabled={busy}
          onClick={download}
        >
          <DownloadSimple size={22} />
          {busy ? "Creating document…" : `Download ${format}`}
        </button>
        {message && (
          <p className="export-message" role="status">
            {message}
          </p>
        )}

        <section className="requirements" aria-labelledby="requirements-title">
          <h2 id="requirements-title">Application requirements</h2>
          <p className="fine">
            Check each item only after you review it. CareerOS keeps the package
            with this opportunity.
          </p>
          <ul>
            {checks.map((item) => (
              <li key={item}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.includes(item)}
                    onChange={(event) =>
                      onCheck(
                        event.target.checked
                          ? [...checked, item]
                          : checked.filter((value) => value !== item),
                      )
                    }
                  />{" "}
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
          {gaps.length > 0 && (
            <div className="requirements-gaps">
              <strong>Worth checking</strong>
              <ul>
                {gaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="question-help">
          <h2>Need help with an application question?</h2>
          <button className="question-card" type="button" onClick={onHelp}>
            <span className="chat-icon">
              <ChatCircle size={23} weight="light" />
            </span>
            <span>
              {job.question ||
                "Why are you excited about this role and how will you make an impact?"}
            </span>
            <ArrowUpRight size={18} />
          </button>
          <button className="ask-button" type="button" onClick={onHelp}>
            <Sparkle size={19} /> Ask CareerOS
          </button>
        </div>
        <p className="prototype-note">
          The regional ATS PDF is available immediately. The editable
          role-specific draft uses the same verified employment record and must
          be reviewed before use.
        </p>
      </section>
    </div>
  );
}
