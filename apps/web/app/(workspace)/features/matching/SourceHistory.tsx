"use client";
import { PageHeader } from "../../components/PageHeader";
import Link from "next/link";
import { useState } from "react";
import { useSourceHistory } from "../../hooks/use-matching";
import { localDate } from "../../lib/career-journey";
export function SourceHistory() {
  const { data, error, isPending } = useSourceHistory();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const visible = (data ?? []).filter((row) => {
    const day = localDate(new Date(row.extracted_at));
    return (!from || day >= from) && (!to || day <= to);
  });
  const groups = Map.groupBy(
    visible,
    (row) =>
      row.extracted_at + "|" + row.adapter + "|" + row.extraction_version,
  );
  return (
    <main>
      <PageHeader
        title="Import history"
        description="Review each import and the reasons behind its matches."
        action={
          <Link className="button secondary" href="/jobs/new">
            Import jobs
          </Link>
        }
      />
      <div className="filters history-filters">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <p className="criteria muted">
        Latest 500 saved job source records. Times are local. Visit Discover
        roles for complete scan results, including roles outside your criteria.
      </p>
      {isPending && <p role="status">Loading source records…</p>}
      {error && (
        <p className="error" role="alert">
          {error.message}
        </p>
      )}
      <div className={visible.length ? "history-list" : undefined}>
        {[...groups.values()].map((rows) => {
          const date = new Date(rows[0].extracted_at),
            session =
              date.getHours() < 12
                ? "Morning"
                : date.getHours() < 18
                  ? "Afternoon"
                  : "Evening";
          return (
            <details className="history-group" key={rows[0].id}>
              <summary>
                {date.toLocaleDateString()} · {session} import{" "}
                <span className="muted">
                  {date.toLocaleTimeString()} · {rows.length}{" "}
                  {rows.length === 1 ? "role" : "roles"}
                </span>
              </summary>
              <p className="criteria muted">
                Source: {rows[0].adapter} · {rows[0].extraction_version}
              </p>
              {rows.map((row) => (
                <article className="history-entry" key={row.id}>
                  <div className="section-title">
                    <Link href={`/jobs/${row.job_id}`}>
                      <strong>
                        {row.company} · {row.title}
                      </strong>
                    </Link>
                    <span className="stage">
                      {row.verdict ?? "Not evaluated"}
                    </span>
                  </div>
                  <p className="criteria muted">
                    Captured {new Date(row.extracted_at).toLocaleString()} ·
                    imported {new Date(row.created_at).toLocaleString()}
                    {row.criteria_version
                      ? ` · criteria v${row.criteria_version}`
                      : ""}
                  </p>
                  {row.reasons?.map((reason) => (
                    <p
                      className={
                        row.verdict === "match" ? "match-reason" : "match-gap"
                      }
                      key={reason}
                    >
                      {reason}
                    </p>
                  ))}
                  {row.gaps?.map((gap) => (
                    <p className="match-gap" key={gap}>
                      Needs review: {gap}
                    </p>
                  ))}
                </article>
              ))}
            </details>
          );
        })}
      </div>
      {!isPending && !error && !visible.length && (
        <section className="card empty">
          <h2>No source records in this range</h2>
          <p>Import scan results to create a timestamped source record.</p>
          <Link href="/jobs/new" className="text-link">
            Import jobs →
          </Link>
        </section>
      )}
    </main>
  );
}
