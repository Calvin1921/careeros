import {
  ClockCounterClockwise,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { applicationReadiness } from "../lib/application-readiness";
import { applicationLane, isQuickApply } from "../lib/application-lane";
import {
  formatDiscoveredAt,
  statusPresentation,
} from "../lib/opportunity-list";
import { JobResultRow } from "./JobResultRow";

function OpportunityRows({ jobs, tracker, onSelect, selectedId, compact }) {
  return (
    <div className="live-discovery__list">
      {jobs.map((job) => {
        const record = tracker.recordFor(job);
        const readiness = applicationReadiness(job);
        const effort = job.effort || "Effort not estimated";
        const presentation = statusPresentation(job, record, readiness);
        return (
          <JobResultRow
            key={`${job.snapshotId}-${job.id}`}
            title={job.title}
            company={job.company}
            location={job.location}
            salary={job.salary}
            work={job.source}
            discoveredAt={formatDiscoveredAt(job.snapshotAt)}
            reason={`Fit ${job.fit}/100 · ${applicationLane(job)} · ${isQuickApply(job) ? "Quick apply" : effort}`}
            uncertainty={job.gaps[0]}
            status={presentation.label}
            tone={presentation.kind}
            selected={selectedId === job.id}
            compact={compact}
            onSelect={() => onSelect(job)}
          />
        );
      })}
    </div>
  );
}

export function SnapshotOpportunityArchive({
  model,
  onSelect,
  tracker,
  selectedId,
  compact = false,
}) {
  const { archive, jobs, counts } = model;
  return (
    <section
      className={`snapshot-archive${compact ? " snapshot-archive--compact" : ""}`}
    >
      <div className="live-discovery__list-head">
        <strong>
          {archive.statusFilter === "all"
            ? "All applications"
            : archive.statusFilter === "to-apply"
              ? "Ready for your attention"
              : archive.statusFilter === "in-progress"
                ? "Active applications"
                : "Closed applications"}
        </strong>
        <span>
          {jobs.length} role{jobs.length === 1 ? "" : "s"}
        </span>
      </div>
      {jobs.length ? (
        <OpportunityRows
          jobs={jobs}
          tracker={tracker}
          onSelect={onSelect}
          selectedId={selectedId}
          compact={compact}
        />
      ) : (
        <section className="live-discovery__state">
          <MagnifyingGlass size={23} />
          <div>
            <strong>No opportunities in this view.</strong>
            <p>
              Choose another status, clear the search, or select another scan.
            </p>
          </div>
        </section>
      )}
    </section>
  );
}

export function OpportunityArchiveToolbar({ model }) {
  const { archive, counts } = model;
  const hasFilters =
    archive.snapshotId !== "all" ||
    archive.query ||
    archive.locationFilter !== "all" ||
    archive.sort !== "recommended" ||
    archive.statusFilter !== "all";
  const orderCopy =
    archive.sort === "recently-found"
      ? "Newest discovery first"
      : archive.sort === "recently-updated"
        ? "Your most recently updated applications first"
        : "Recommended: fit 65% · interview chance 20% · freshness 10% · urgency 5%";
  return (
    <section
      className="opportunity-toolbar"
      aria-label="Search and filter opportunities"
    >
      <div className="snapshot-archive__controls">
        <label className="live-discovery__search">
          <MagnifyingGlass size={18} />
          <span>Search</span>
          <input
            value={archive.query}
            onChange={(event) => archive.setQuery(event.target.value)}
            placeholder="Company, role or skill"
          />
        </label>
        <label>
          <span>Found during</span>
          <select
            value={archive.snapshotId}
            onChange={(event) => archive.setSnapshotId(event.target.value)}
          >
            <option value="all">All scans · rolling backlog</option>
            {archive.snapshots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.jobs.length} roles
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Location</span>
          <select
            value={archive.locationFilter}
            onChange={(event) => archive.setLocationFilter(event.target.value)}
          >
            <option value="all">All eligible locations</option>
            <option value="hong-kong">Hong Kong · local or remote</option>
            <option value="worldwide-remote">
              Worldwide remote · outside HK
            </option>
          </select>
        </label>
        <label>
          <span>Order</span>
          <select
            value={archive.sort}
            onChange={(event) => archive.setSort(event.target.value)}
          >
            <option value="recommended">Recommended first</option>
            <option value="recently-found">Recently found first</option>
            <option value="recently-updated">Recently updated first</option>
          </select>
        </label>
      </div>
      <div className="snapshot-archive__context">
        <ClockCounterClockwise size={16} />
        <p>{orderCopy}</p>
        {hasFilters && (
          <button onClick={archive.reset}>
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>
      <div
        className="opportunity-status-filter"
        aria-label="Application status"
      >
        {[
          ["all", "All"],
          ["to-apply", "To apply"],
          ["in-progress", "In progress"],
          ["closed", "Closed"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={archive.statusFilter === id}
            onClick={() => archive.setStatusFilter(id)}
          >
            {label}
            <span>{counts[id]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
