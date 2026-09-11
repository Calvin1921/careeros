import {
  ArrowRight,
  CheckCircle,
  Play,
  WarningCircle,
} from "@phosphor-icons/react";
import { applicationReadiness } from "../lib/application-readiness";
import { rankedOpportunities } from "../lib/opportunity-priority";
import { effectiveSweepTimes } from "../lib/search-rhythm";
import { ApplySessionSummary } from "./ApplySessionSummary";
import { BriefingSnapshot } from "./BriefingSnapshot";
import { FunnelOverview } from "./FunnelOverview";
import { JobResultRow } from "./JobResultRow";
import { MarketPulse } from "./MarketPulse";
import { ScheduledScans } from "./ScheduledScans";
import "./command-center.css";

function formatHkt(value) {
  if (!value) return "No completed scan";
  return `${new Intl.DateTimeFormat("en-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(value))} HKT`;
}

function PriorityRoles({ jobs, tracker, onOpenJob, snapshot }) {
  if (!jobs.length)
    return (
      <div className="briefing-empty">
        No opportunities are available in this scan.
      </div>
    );
  return (
    <div className="briefing-role-list">
      {jobs.map((row) => {
        const record = tracker.recordFor(row);
        const status = record.status;
        const readiness = applicationReadiness(row);
        return (
          <JobResultRow
            key={row.id}
            title={row.title}
            company={row.company}
            location={row.location}
            salary={row.salary}
            work={row.source}
            reason={`${row.fit}/100 fit · ${readiness.label}`}
            uncertainty={row.gaps?.[0]}
            status={
              record.possibleDuplicate
                ? "Possible duplicate"
                : status === "Not started"
                  ? readiness.label
                  : status
            }
            tone={
              record.possibleDuplicate || readiness.kind !== "ready"
                ? "review"
                : "match"
            }
            onSelect={() =>
              onOpenJob({
                ...row,
                snapshot: true,
                snapshotId: snapshot.id,
                snapshotLabel: snapshot.label,
                snapshotAt: snapshot.scannedAt,
                conversation: snapshot.conversation,
                verdict: "match",
              })
            }
          />
        );
      })}
    </div>
  );
}

export function BriefingPage({
  briefing,
  snapshot,
  tracker,
  onOpenJob,
  onOpenOpportunities,
  onSchedule,
}) {
  const { overview, loading, error, scan, scanning } = briefing;
  const times = effectiveSweepTimes(overview?.settings?.schedule_times);
  const opportunities = rankedOpportunities(snapshot?.jobs || []);
  const preview = opportunities
    .filter((job) => applicationReadiness(job).kind !== "evidence-gap")
    .slice(0, 3);
  return (
    <section className="briefing-page" aria-labelledby="briefing-title">
      <header className="briefing-hero">
        <div>
          <p className="briefing-kicker">
            <span /> Agent briefing · fictional demo
          </p>
          <h1 id="briefing-title">Your search is working in the background.</h1>
          <p>
            Explore a fictional scan snapshot. Review opportunities and prepare
            a package before taking any external action.
          </p>
        </div>
        <button className="briefing-scan" onClick={scan} disabled={scanning}>
          <Play size={16} weight="fill" />
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </header>
      {error ? (
        <div className="briefing-error" role="alert">
          <WarningCircle size={20} />
          <div>
            <strong>The latest briefing could not be loaded.</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="briefing-loading" role="status">
          Preparing your briefing…
        </div>
      ) : (
        <>
          <ApplySessionSummary
            jobs={opportunities}
            onStart={onOpenOpportunities}
          />
          <div className="briefing-grid">
            <main>
              <BriefingSnapshot snapshot={snapshot} />
              <MarketPulse discovery={briefing} selectedJobs={opportunities} />
              <section className="briefing-attention">
                <div className="briefing-section-heading">
                  <div>
                    <p className="briefing-label">Apply first</p>
                    <h2>Best credible applications</h2>
                  </div>
                  <button onClick={onOpenOpportunities}>
                    View all {opportunities.length} <ArrowRight size={16} />
                  </button>
                </div>
                <PriorityRoles
                  jobs={preview}
                  tracker={tracker}
                  onOpenJob={onOpenJob}
                  snapshot={snapshot}
                />
              </section>
            </main>
            <aside>
              <ScheduledScans times={times} onManage={onSchedule} />
              <FunnelOverview
                metrics={tracker.metrics}
                guidance={tracker.guidance}
                onOpenOpportunities={onOpenOpportunities}
              />
              <section className="briefing-progress">
                <p className="briefing-label">What CareerOS completed</p>
                <ol>
                  <li>
                    <CheckCircle size={17} weight="fill" />
                    <span>Expanded role families before filtering</span>
                  </li>
                  <li>
                    <CheckCircle size={17} weight="fill" />
                    <span>Separated application and offer thresholds</span>
                  </li>
                  <li>
                    <CheckCircle size={17} weight="fill" />
                    <span>Prepared CV routes and employer links</span>
                  </li>
                  <li className="briefing-progress__waiting">
                    <WarningCircle size={17} />
                    <span>Employer status still needs rechecking</span>
                  </li>
                </ol>
                <small>Delivered: {formatHkt(snapshot?.scannedAt)}</small>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
