import type { Analytics } from "./types";
export function ProgressChart({ analytics }: { analytics: Analytics }) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>From saved role to offer</h2>
        <span className="count">
          {analytics.cohort.sampleSize} applications
        </span>
      </div>
      <p className="section-caption">
        How far the applications in this group have progressed.
      </p>
      <div className="funnel-chart">
        {analytics.funnel.map((item) => (
          <div className="funnel-row" key={item.stage}>
            <span>{item.stage}</span>
            <div className="funnel-track">
              <span style={{ width: `${item.cohortRatePercent ?? 0}%` }} />
            </div>
            <strong>{item.reached}</strong>
          </div>
        ))}
      </div>
      {analytics.cohort.excludedCorrectedApplications > 0 && (
        <p className="criteria muted">
          {analytics.cohort.excludedCorrectedApplications} applications with
          corrected history excluded.
        </p>
      )}
    </section>
  );
}
