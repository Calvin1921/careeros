"use client";
import { ViewTabs } from "../../components/ViewTabs";
import Link from "next/link";
import { useState } from "react";
import type { JobRecord } from "@careeros/domain";
import type { Overview } from "../../hooks/use-workspace";
import { localDate, jobGuide } from "../../lib/career-journey";
export function TodayQueues({
  jobs,
  overview,
}: {
  jobs: JobRecord[];
  overview: Overview;
}) {
  const [view, setView] = useState("apply");
  const apply = jobs.filter((j) => j.stage === "shortlisted"),
    review = jobs.filter((j) => j.stage === "discovered"),
    interviews = jobs.filter(
      (j) => j.stage === "screening" || j.stage === "interview",
    );
  const list =
    view === "apply" ? apply : view === "review" ? review : interviews;
  const tabs = [
    ["apply", "Apply list", apply.length],
    ["review", "To review", review.length],
    ["interviews", "Conversations", interviews.length],
    ["followups", "Follow-ups", overview.decisions.length],
  ] as const;
  return (
    <section className="card">
      <div className="section-title">
        <h2>Your working list</h2>
        <span className="muted criteria"></span>
      </div>
      <ViewTabs
        id="today"
        panelId="today-panel"
        label="Working list"
        items={tabs.map(([value, label, count]) => ({ value, label, count }))}
        value={view}
        onChange={setView}
      />
      <div
        role="tabpanel"
        id="today-panel"
        aria-labelledby={`today-tab-${view}`}
        tabIndex={0}
      >
        <p className="section-caption">
          {view === "apply"
            ? "Prepare your materials, then apply through the original posting."
            : view === "review"
              ? "New and earlier discoveries awaiting your decision."
              : view === "interviews"
                ? "Applications with an active screening or interview stage."
                : "Open decisions due today or earlier."}
        </p>
        {view === "followups"
          ? overview.decisions.map((item) => (
              <Link
                className="queue-row"
                href={`/jobs/${item.job_id}#tasks`}
                key={item.id}
              >
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.company} · {item.role_title}
                  </small>
                </div>
                <span className="due overdue">{item.due_date}</span>
              </Link>
            ))
          : list.map((job) => (
              <Link
                className="queue-row"
                href={`/jobs/${job.id}#${jobGuide(job.stage).section}`}
                key={job.id}
              >
                <div>
                  <strong>{job.title}</strong>
                  <small>
                    {job.company}{" "}
                    {localDate(new Date(job.created_at)) === overview.today
                      ? "· Added today"
                      : ""}
                  </small>
                </div>
                <span className="text-link">
                  {view === "apply"
                    ? "Prepare application"
                    : view === "review"
                      ? "Review fit"
                      : "Prepare for conversation"}{" "}
                  →
                </span>
              </Link>
            ))}
        {(view === "followups" ? !overview.decisions.length : !list.length) && (
          <p className="empty-inline">
            {view === "apply"
              ? "No shortlisted roles yet. Review a discovery and shortlist it to start your apply list."
              : view === "review"
                ? "No discoveries awaiting review. Save a job or import scan results to add one."
                : view === "interviews"
                  ? "No conversations recorded yet. Update the application stage when you receive an invitation."
                  : "Nothing due right now."}
          </p>
        )}
      </div>
    </section>
  );
}
