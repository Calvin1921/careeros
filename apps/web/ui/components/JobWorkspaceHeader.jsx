import { ArrowLeft, MapPin } from "@phosphor-icons/react";
import "./job-workspace.css";

const labels = {
  review: "Reviewing role",
  prepare: "Preparing application",
  apply: "Ready to apply",
};

export function JobWorkspaceHeader({ job, view, origin, onBack }) {
  const destination =
    origin === "briefing"
      ? "Briefing"
      : origin === "opportunities"
        ? "Opportunities"
        : origin === "today"
          ? "Today"
          : origin === "applications"
            ? "Applications"
            : "Find roles";
  return (
    <header className="job-workspace-header">
      <button className="job-workspace-back" onClick={onBack}>
        <ArrowLeft size={17} /> Back to {destination}
      </button>
      <div className="job-workspace-identity">
        <div>
          <p className="job-workspace-company">{job.company}</p>
          <h1>{job.title}</h1>
          <p className="job-workspace-facts">
            <MapPin size={16} />
            {job.location}
            <span aria-hidden="true">·</span>
            {job.salary}
          </p>
        </div>
        <div className="job-workspace-state">
          <span>{labels[view]}</span>
          <small>Tailored from your CV</small>
        </div>
      </div>
    </header>
  );
}
