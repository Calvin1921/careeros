import type { Analytics } from "./types";
const number = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value}${suffix}`;
export function AnalyticsTables({ analytics }: { analytics: Analytics }) {
  return (
    <div className="insight-grid">
      <section className="data-section">
        <h2>Conversion details</h2>
        <p className="muted criteria">
          Sample: {analytics.cohort.sampleSize} applications ·{" "}
          {analytics.cohort.timezone}
          {analytics.cohort.excludedCorrectedApplications > 0
            ? ` · ${analytics.cohort.excludedCorrectedApplications} corrected excluded`
            : ""}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Reached</th>
                <th>Of all applications</th>
                <th>From previous stage</th>
              </tr>
            </thead>
            <tbody>
              {analytics.funnel.map((item) => (
                <tr key={item.stage}>
                  <td>{item.stage}</td>
                  <td>{item.reached}</td>
                  <td>
                    {number(item.cohortRatePercent, "%")} (n=
                    {item.cohortDenominator})
                  </td>
                  <td>
                    {number(item.priorMilestoneRatePercent, "%")} (n=
                    {item.priorMilestoneDenominator})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="section-disclosure">
          <summary>How this is calculated</summary>
          <p className="criteria muted">
            {analytics.cohort.definition} {analytics.funnelDefinition}
          </p>
        </details>
      </section>
      <section className="data-section">
        <h2>Time in stage</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Average</th>
                <th>Median</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {analytics.timeInStage.map((item) => (
                <tr key={item.stage}>
                  <td>{item.stage}</td>
                  <td>{number(item.averageDays, " days")}</td>
                  <td>{number(item.medianDays, " days")}</td>
                  <td>{item.sampleSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="section-disclosure">
          <summary>How this is calculated</summary>
          <p className="criteria muted">{analytics.durationDefinition}</p>
        </details>
        <p>
          Outcomes: {analytics.outcomes.accepted} accepted ·{" "}
          {analytics.outcomes.rejected} rejected ·{" "}
          {analytics.outcomes.withdrawn} withdrawn
        </p>
      </section>
    </div>
  );
}
