"use client";
import { PageHeader } from "../../components/PageHeader";
import { ViewTabs, ViewPanel } from "../../components/ViewTabs";
import { useState } from "react";
import { useAnalytics } from "../../hooks/use-intelligence";
import { useWorkspaceSection } from "../../hooks/use-workspace-section";
import { AnalyticsTables } from "./AnalyticsTables";
import { MemoryWorkspace } from "./MemoryWorkspace";
import Link from "next/link";
import { StatusSummary } from "./StatusSummary";
import { ProgressChart } from "./ProgressChart";
const sections = ["progress", "notes"] as const;
export function InsightsWorkspace() {
  const { section, select } = useWorkspaceSection(sections, "progress");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const {
    data: a,
    isPending,
    error,
    refetch,
  } = useAnalytics(dates.from, dates.to, timezone);
  const submitted = a?.funnel.find((x) => x.stage === "applied")?.reached ?? 0;
  return (
    <main>
      <PageHeader
        title="Insights"
        description="See where applications progress and where they stall."
      />
      <ViewTabs
        id="insights"
        label="Insights views"
        items={[
          { value: "progress", label: "Application progress" },
          { value: "notes", label: "Saved notes" },
        ]}
        value={section}
        onChange={select}
      />
      <ViewPanel id="insights" value="notes" selected={section}>
        <MemoryWorkspace />
      </ViewPanel>
      <ViewPanel id="insights" value="progress" selected={section}>
        {error && (
          <p className="error" role="alert">
            {error.message}{" "}
            <button onClick={() => void refetch()}>Retry</button>
          </p>
        )}
        {isPending && <p role="status">Loading your progress…</p>}
        {a && <StatusSummary analytics={a} />}
        <section className="date-toolbar" aria-label="Application date range">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setDates({
                from: String(data.get("from") || ""),
                to: String(data.get("to") || ""),
              });
            }}
          >
            <div className="filters">
              <label>
                Added from
                <input name="from" type="date" />
              </label>
              <label>
                Through
                <input name="to" type="date" />
              </label>
              <button className="secondary">Apply dates</button>
            </div>
          </form>
          <p className="criteria muted">
            Filter by date added. Current status totals include all roles.
          </p>
        </section>
        {a &&
          (submitted > 0 ? (
            <>
              <ProgressChart analytics={a} />
              <details className="card">
                <summary>Explore conversion rates and time in stage</summary>
                <AnalyticsTables analytics={a} />
              </details>
            </>
          ) : (
            <section className="card">
              <h2>Progress patterns come next</h2>
              <p className="section-caption">
                No applications in this date group have reached Applied yet.
                Once they do, you’ll see how many reach conversations and how
                long each stage takes. Applications with corrected history are
                excluded from this view.
              </p>
              <Link className="text-link" href="/jobs#shortlisted">
                Review your apply list →
              </Link>
            </section>
          ))}
      </ViewPanel>
    </main>
  );
}
