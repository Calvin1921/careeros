"use client";
import { PageHeader } from "../../components/PageHeader";
import Link from "next/link";
import { useWorkspaceSection } from "../../hooks/use-workspace-section";
import { localDate, jobGuide } from "../../lib/career-journey";
import { MatchSummary } from "../matching/MatchSummary";
import { useMatchResults } from "../../hooks/use-matching";
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { stages } from "@careeros/domain";
import { useJobs } from "../../hooks/use-jobs";
const filters = ["active", "all", "today", ...stages] as const;
export function JobsList() {
  const { data: jobs = [], error, isPending, refetch } = useJobs();
  const { section: filter, select: setFilter } = useWorkspaceSection(
    filters,
    "shortlisted",
  );
  const [search, setSearch] = useState("");
  const matching = useMatchResults();
  const visible = jobs.filter(
    (job) =>
      (filter === "all" ||
        (filter === "today"
          ? localDate(new Date(job.created_at)) === localDate(new Date())
          : filter === "active"
            ? !["accepted", "rejected", "withdrawn"].includes(job.stage)
            : job.stage === filter)) &&
      `${job.title} ${job.company}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <main>
      <PageHeader
        title="Applications"
        description="Your shortlist, ready to prepare and apply."
        action={
          <Link className="button secondary" href="/jobs/new">
            Add a job
          </Link>
        }
      />
      <p className="context-links">
        <Link href="/scans">Import history →</Link>
        <Link href="/criteria">Search criteria →</Link>
      </p>
      <div className="filters">
        <label>
          Find a role
          <input
            type="search"
            value={search}
            placeholder="Company or role"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Show
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="shortlisted">Shortlisted · to apply</option>
            <option value="active">All active roles</option>
            <option value="all">All roles</option>
            <option value="today">Saved today</option>
            {stages
              .filter((stage) => stage !== "shortlisted")
              .map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
          </select>
        </label>
      </div>
      {isPending && <p role="status">Loading your roles…</p>}
      {error && (
        <p role="alert" className="error">
          {error.message}{" "}
          <button className="secondary" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}
      {!isPending && !error && (
        <>
          <p className="muted">
            {visible.length} {visible.length === 1 ? "role" : "roles"}
          </p>
          <div className="jobs-grid">
            {visible.map((job) => (
              <Link
                className="role-card"
                key={job.id}
                href={`/jobs/${job.id}#${jobGuide(job.stage).section}`}
              >
                <span className="company-avatar" aria-hidden="true">
                  {job.company.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2>{job.title}</h2>
                  <p className="company">{job.company}</p>
                  <MatchSummary
                    evaluation={matching.data?.find((x) => x.job_id === job.id)}
                    pending={matching.isPending}
                    failed={matching.isError}
                  />
                </div>
                <span className="stage" data-stage={job.stage}>
                  {job.stage}
                </span>

                <span className="row-arrow">
                  <Icon name="arrow" size={18} />
                </span>
              </Link>
            ))}
          </div>
          {!visible.length && (
            <section className="card empty">
              <h2>
                {jobs.length
                  ? "No roles in this view"
                  : "Save a role to get started"}
              </h2>
              <p>
                {jobs.length
                  ? "Save your search criteria and process discoveries, or choose a different view."
                  : "Keep the description, requirements and every next action together."}
              </p>
              <Link href="/criteria">Set matching criteria →</Link>
            </section>
          )}
        </>
      )}
    </main>
  );
}
