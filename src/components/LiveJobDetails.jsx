import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  WarningCircle,
} from "@phosphor-icons/react";
import { applicationReadiness } from "../lib/application-readiness";
import { readApi, safeEmployerUrl } from "../lib/live-api";
import { ApplicationStatusControl } from "./ApplicationStatusControl";
import { JobDetailMetrics } from "./JobDetailMetrics";
import "./live-job-details.css";
import "./application-flow.css";

function descriptionText(html) {
  if (!html) return "";
  const decoded = new DOMParser().parseFromString(html, "text/html");
  const document = decoded.body.children.length
    ? decoded
    : new DOMParser().parseFromString(decoded.body.textContent, "text/html");
  document
    .querySelectorAll("script,style,iframe,object")
    .forEach((node) => node.remove());
  document
    .querySelectorAll("p,li,h1,h2,h3,h4,div,br")
    .forEach((node) => node.append("\n"));
  return document.body.textContent
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function EmployerDescription({ job, supported, query, description }) {
  if (job.employerSummary)
    return (
      <section>
        <h2>Employer job description summary</h2>
        <div className="live-detail__description">
          <p>{job.employerSummary.intro}</p>
          <h3>What you would do</h3>
          <ul>
            {job.employerSummary.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3>What they are looking for</h3>
          <ul>
            {job.employerSummary.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    );
  if (job.snapshot)
    return (
      <section>
        <h2>Job description availability</h2>
        <div className="live-detail__description live-detail__description--missing">
          <strong>
            The original employer description was not stored in this scan.
          </strong>
          <p>
            <b>What the scan captured:</b> {job.summary}
          </p>
          <p>
            Open the employer page to recover the current description. CareerOS
            keeps scan analysis separate so it is never mistaken for
            employer-authored requirements.
          </p>
        </div>
      </section>
    );
  if (query.isPending && supported)
    return (
      <section>
        <h2>Job description</h2>
        <p role="status">Loading the employer’s description…</p>
      </section>
    );
  if (query.isError)
    return (
      <section>
        <h2>Job description</h2>
        <div role="alert">
          <p>
            The description could not be retrieved. You can still open the
            original listing.
          </p>
          <button className="text-button" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      </section>
    );
  return (
    <section>
      <h2>Job description</h2>
      <div className="live-detail__description">
        {description || "No description is available from this source."}
      </div>
    </section>
  );
}

export function LiveJobDetails({
  job,
  application,
  onStatusChange,
  onResolveDuplicate,
  onPrepare,
  onBack,
  backLabel = "Opportunities",
  embedded = false,
}) {
  const supported =
    !job.snapshot &&
    /^[a-z0-9_-]{1,80}$/.test(job.source || "") &&
    /^\d{1,20}$/.test(job.source_job_id || "");
  const query = useQuery({
    queryKey: ["source-job", job.source, job.source_job_id],
    enabled: supported,
    queryFn: ({ signal }) =>
      readApi(`/source/${job.source}/jobs/${job.source_job_id}`, { signal }),
    retry: 1,
    staleTime: 300000,
  });
  const url = safeEmployerUrl(query.data?.absolute_url || job.url);
  const description = descriptionText(query.data?.content);
  const readiness = applicationReadiness(job);
  return (
    <section
      className={`live-detail${embedded ? " live-detail--embedded" : ""}`}
    >
      {!embedded && (
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={17} /> Back to {backLabel}
        </button>
      )}
      <header>
        <p className="eyebrow">{job.company}</p>
        <h1>{job.title}</h1>
        <p className="live-detail__meta">
          {job.location || "Location not stated"}
        </p>
        <JobDetailMetrics job={job} />
      </header>
      <ol className="live-detail__journey" aria-label="Application workflow">
        <li className="is-current">
          <span>1</span>Review fit and gaps
        </li>
        <li>
          <span>2</span>Prepare grounded CV
        </li>
        <li>
          <span>3</span>Submit with employer
        </li>
        <li>
          <span>4</span>Record status
        </li>
      </ol>
      <div className="live-detail__layout">
        <article>
          <section className="live-detail__signals">
            <h2>
              {job.verdict === "match"
                ? "Why it passed the search rules"
                : "Check these points before applying"}
            </h2>
            <p>
              These are automated listing signals, not a verified assessment of
              your experience.
            </p>
            <ul>
              {[...(job.reasons || []), ...(job.gaps || [])].map(
                (reason, index) => (
                  <li key={index}>{reason}</li>
                ),
              )}
            </ul>
            {job.matched_skills?.length > 0 && (
              <p>
                <strong>Keywords found:</strong>{" "}
                {job.matched_skills.join(" · ")}
              </p>
            )}
          </section>
          <EmployerDescription
            job={job}
            supported={supported}
            query={query}
            description={description}
          />
        </article>
        <aside>
          <section
            className={`live-detail__readiness live-detail__readiness--${readiness.kind}`}
          >
            <p className="briefing-label">Application decision</p>
            <h2>{readiness.title}</h2>
            <p>{readiness.body}</p>
            {readiness.kind !== "evidence-gap" && (
              <button className="live-detail__prepare" onClick={onPrepare}>
                Prepare grounded CV <ArrowRight size={18} />
              </button>
            )}
            {readiness.kind === "evidence-gap" && (
              <div className="live-detail__hold">
                <WarningCircle size={17} />
                <span>Keep for market analysis and capability planning.</span>
              </div>
            )}
          </section>
          <ApplicationStatusControl
            record={application}
            onChange={onStatusChange}
            onResolveDuplicate={onResolveDuplicate}
          />
          <section className="live-detail__source">
            <h2>Original listing</h2>
            <p>
              {job.snapshot
                ? "Reconfirm that the listing is open, eligible and unchanged before applying."
                : "Confirm salary, eligibility and application requirements with the employer."}
            </p>
            {url && (
              <a
                className="live-detail__apply"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open employer page <ArrowUpRight size={18} />
              </a>
            )}
            <small>
              Source: {job.source}
              <br />
              {job.snapshot
                ? `Delivered by: ${job.conversation || job.snapshotLabel}`
                : `Scan checked: ${job.checked ? new Date(job.checked).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" }) + " HKT" : "Not recorded"}`}
            </small>
          </section>
        </aside>
      </div>
    </section>
  );
}
