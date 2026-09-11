"use client";
import Link from "next/link";
import { useState } from "react";
import { useScanResults } from "../../hooks/use-discovery";
import type { ScanRun } from "./types";
export function ScanResults({ run }: { run: ScanRun }) {
  const [filter, setFilter] = useState("match"),
    [offset, setOffset] = useState(0);
  const running = ["queued", "running"].includes(run.status);
  const results = useScanResults(run.id, filter, offset, running);
  return (
    <section aria-label="Scan results">
      <div className="section-title">
        <h2>{running ? "Results arriving…" : "Scan results"}</h2>
        <label className="scan-filter">
          Show
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="match">Matching roles</option>
            <option value="review">Needs clarification</option>
            <option value="excluded">Outside criteria</option>
            <option value="all">Everything checked</option>
          </select>
        </label>
      </div>
      {results.isPending && <p role="status">Loading results…</p>}
      {results.error && (
        <p className="error" role="alert">
          {results.error.message}
        </p>
      )}
      {results.data && (
        <>
          <p className="muted">
            {results.data.total} {results.data.total === 1 ? "role" : "roles"} ·
            criteria v{run.plan.criteriaVersion}
          </p>
          <div className="scan-results">
            {results.data.items.map((item) => (
              <article
                className="card scan-result"
                key={item.source + item.source_job_id}
              >
                <div className="section-title">
                  <div>
                    <p className="company">{item.company}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <span className="stage">
                    {item.stage ??
                      (item.verdict === "match"
                        ? "Matches criteria"
                        : item.verdict === "review"
                          ? "Needs clarification"
                          : "Outside criteria")}
                  </span>
                </div>
                <p className="muted">
                  {item.location || "Location not confirmed"} ·{" "}
                  {item.salary || "Salary not listed separately"}
                </p>
                <p
                  className={
                    item.verdict === "match" ? "match-reason" : "match-gap"
                  }
                >
                  {item.reasons.join(" · ")}
                </p>
                {item.gaps.length > 0 && (
                  <p className="match-gap">{item.gaps.join(" · ")}</p>
                )}
                <div className="context-links">
                  {item.job_id ? (
                    <Link className="text-link" href={`/jobs/${item.job_id}`}>
                      {item.stage === "shortlisted"
                        ? "Prepare application"
                        : "Open application"}{" "}
                      →
                    </Link>
                  ) : (
                    <span />
                  )}
                  <a
                    className="text-link"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Company posting ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
          {!results.data.total && (
            <div className="card empty">
              <h3>
                {running ? "Checking company pages" : "No roles in this view"}
              </h3>
              <p>
                {running
                  ? "Matching roles will appear as each source finishes."
                  : "Review the source coverage and any roles needing clarification. No matches from these boards does not mean no suitable jobs exist elsewhere."}
              </p>
            </div>
          )}
          {results.data.total > 50 && (
            <div className="actions">
              <button
                className="secondary"
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Previous
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 50, results.data.total)} of{" "}
                {results.data.total}
              </span>
              <button
                className="secondary"
                disabled={offset + 50 >= results.data.total}
                onClick={() => setOffset(offset + 50)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
