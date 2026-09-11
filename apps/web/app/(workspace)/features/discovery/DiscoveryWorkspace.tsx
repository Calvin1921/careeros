"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useDiscovery } from "../../hooks/use-discovery";
import { DiscoverySettings } from "./DiscoverySettings";
import { ScanResults } from "./ScanResults";
export function DiscoveryWorkspace() {
  const { overview, scan, settings, refresh } = useDiscovery();
  const [selected, setSelected] = useState("");
  const data = overview.data;
  const run = data?.runs.find((r) => r.id === selected) ?? data?.runs[0];
  const active = data?.runs.some((r) =>
    ["queued", "running"].includes(r.status),
  );
  const latestStatus = data?.runs[0]?.status;
  useEffect(() => {
    if (latestStatus && !["queued", "running"].includes(latestStatus))
      void refresh();
  }, [latestStatus]);
  const roles =
    data?.criteria?.rules.roleTerms ?? data?.signals.roleTerms ?? [];
  return (
    <main>
      <PageHeader
        title="Discover roles"
        description="Find suitable roles on company career pages, ready for your apply list."
        action={
          <button
            disabled={!roles.length || scan.isPending || active}
            onClick={() =>
              scan.mutate(undefined, {
                onSuccess: (run) => setSelected(run.id),
              })
            }
          >
            {active
              ? "Scan in progress…"
              : scan.isPending
                ? "Starting…"
                : "Scan now"}
          </button>
        }
      />
      {overview.isPending && <p role="status">Loading discovery…</p>}
      {(overview.error || scan.error) && (
        <p className="error" role="alert">
          {(overview.error || scan.error)?.message}
        </p>
      )}
      {data && (
        <>
          <section className="card">
            <div className="section-title">
              <h2>
                {roles.length ? "Your search is ready" : "Start with your CV"}
              </h2>
              <Link className="text-link" href="/criteria">
                Review criteria →
              </Link>
            </div>
            {roles.length ? (
              <>
                <p>
                  Looking for <strong>{roles.join(", ")}</strong>.
                </p>
                <p className="muted">
                  {data.criteria?.rules.location === "any"
                    ? "All locations"
                    : "Hong Kong or explicitly worldwide remote"}{" "}
                  ·{" "}
                  {data.criteria?.rules.salaryFloorHkd
                    ? `HKD ${data.criteria.rules.salaryFloorHkd.toLocaleString()} / month minimum`
                    : "No salary floor set"}
                </p>
                <p className="muted">
                  {data.signals.skills.length
                    ? `CV skill signals: ${data.signals.skills.join(", ")}`
                    : "No CV skill signals yet. This scan will use your saved criteria only."}
                </p>
                {!data.criteria && (
                  <p className="criteria muted">
                    Starting the first scan saves these CV-derived role terms as
                    editable search criteria and enables shortlisting. CV
                    mentions guide discovery; they do not confirm proficiency.
                  </p>
                )}
                {data.criteria && !data.criteria.rules.autoShortlist && (
                  <p className="notice">
                    Automatic shortlisting is off in your criteria. Matches will
                    be shown here without moving to the shortlist.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  Upload your CV to suggest target roles and recognize your
                  skills. Confirm preferences your CV cannot establish in Search
                  criteria.
                </p>
                <Link className="button" href="/profile">
                  Upload my CV →
                </Link>
              </>
            )}
          </section>
          <DiscoverySettings value={data.settings} mutation={settings} />
          <p className="criteria muted">
            Public company boards only. Source data is reused for one hour; Scan
            now reapplies your latest criteria. Coverage is limited to the
            companies selected above.
          </p>
          {data.runs.length > 0 ? (
            <>
              <label className="scan-history-select">
                Scan history · latest 12 runs
                <select
                  value={run?.id ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {data.runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      {r.trigger === "scheduled" ? "Scheduled" : "Manual"} ·{" "}
                      {r.status}
                    </option>
                  ))}
                </select>
              </label>
              {run && (
                <>
                  <details
                    className="card"
                    open={run.status === "failed" || run.status === "partial"}
                  >
                    <summary>
                      Source coverage{" "}
                      <span className="muted">
                        {run.source_results.length} / {run.plan.sources.length}{" "}
                        checked · {run.status}
                      </span>
                    </summary>
                    {run.error && <p className="error">{run.error}</p>}
                    {run.source_results.map((source) => (
                      <div className="source-report" key={source.token}>
                        <strong>{source.company ?? source.token}</strong>
                        {source.status === "failed" ? (
                          <p className="error">{source.error}</p>
                        ) : (
                          <p className="muted">
                            {source.checked} roles checked · {source.matched}{" "}
                            match · {source.added} moved to shortlist
                            <br />
                            Source fetched{" "}
                            {source.fetchedAt
                              ? new Date(source.fetchedAt).toLocaleString()
                              : "—"}
                            {source.cached ? " · reused cached source" : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </details>
                  <ScanResults key={run.id} run={run} />
                </>
              )}
            </>
          ) : (
            <section className="card empty">
              <h2>Your first shortlist starts here</h2>
              <p>
                Run a scan to check the selected career pages. You’ll get the
                matching roles and a record of everything checked.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
