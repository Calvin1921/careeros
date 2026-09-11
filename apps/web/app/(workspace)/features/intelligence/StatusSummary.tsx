import Link from "next/link";
import type { Analytics } from "./types";
import { statusSegments, donutGradient } from "./status-summary";
export function StatusSummary({ analytics }: { analytics: Analytics }) {
  const groups = statusSegments(analytics.currentStages);
  const total = groups.reduce((sum, x) => sum + x.count, 0);
  const review = groups[0].count,
    prepare = groups[1].count;
  return (
    <section className="card">
      <h2>Where your search stands</h2>
      {!total ? (
        <div className="empty">
          <h3>Start with your first opportunity</h3>
          <p>
            Once you save and apply to roles, this view will show where your
            applications are moving.
          </p>
          <Link className="button" href="/jobs/new">
            Add a job →
          </Link>
        </div>
      ) : (
        <>
          <div className="status-visual">
            <div
              className="status-donut"
              style={{ background: donutGradient(groups) }}
              aria-label={`${total} saved applications; breakdown follows`}
              role="img"
            >
              <strong>{total}</strong>
            </div>
            <ul className="status-legend">
              {groups
                .filter((x) => x.count > 0)
                .map((x) => (
                  <li key={x.label}>
                    <span
                      className="legend-dot"
                      style={{ background: x.color }}
                    />
                    <span>{x.label}</span>
                    <strong>{x.count}</strong>
                  </li>
                ))}
            </ul>
          </div>
          <p className="insight-takeaway">
            {prepare
              ? `${prepare} shortlisted ${prepare === 1 ? "role is" : "roles are"} still waiting for application materials. Finishing these is the next step toward a response.`
              : review
                ? `${review} ${review === 1 ? "role needs" : "roles need"} a fit review. Shortlist the ones you want to pursue.`
                : groups[2].count
                  ? "Your submitted applications are awaiting responses. Keep their stages and follow-up dates up to date."
                  : "Use the stage breakdown to keep track of your active conversations and outcomes."}
          </p>
          <Link
            className="text-link"
            href={
              prepare
                ? "/jobs#shortlisted"
                : review
                  ? "/jobs#discovered"
                  : "/jobs"
            }
          >
            {prepare
              ? "Work through the apply list"
              : review
                ? "Review opportunities"
                : "Open applications"}{" "}
            →
          </Link>
        </>
      )}
    </section>
  );
}
