import { applicationReadiness } from "../lib/application-readiness";

function number(value) {
  return Number(value) || 0;
}

export function BriefingSnapshot({ run, snapshot }) {
  if (snapshot) {
    const sources = new Set(snapshot.jobs.map((job) => job.source));
    const applyNow = snapshot.jobs.filter(
      (job) => applicationReadiness(job).kind !== "evidence-gap" && job.url,
    ).length;
    const averageFit = Math.round(
      snapshot.jobs.reduce((sum, job) => sum + job.fit, 0) /
        Math.max(snapshot.jobs.length, 1),
    );
    return (
      <section className="briefing-snapshot" aria-labelledby="snapshot-title">
        <div>
          <p className="briefing-label">Latest consolidated snapshot</p>
          <h2 id="snapshot-title">{snapshot.label}</h2>
          <p>
            {snapshot.jobs.length} roles from the latest strategy review, with
            application effort, evidence gaps and source links kept attached.
          </p>
        </div>
        <dl>
          <div>
            <dt>Roles</dt>
            <dd>{snapshot.jobs.length}</dd>
          </div>
          <div>
            <dt>Actionable</dt>
            <dd>{applyNow}</dd>
          </div>
          <div>
            <dt>Avg. fit</dt>
            <dd>{averageFit}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{sources.size}</dd>
          </div>
        </dl>
      </section>
    );
  }
  const sources = Array.isArray(run?.source_results) ? run.source_results : [];
  const totals = sources.reduce(
    (sum, source) => ({
      checked: sum.checked + number(source.checked),
      matched: sum.matched + number(source.matched),
      review: sum.review + number(source.review),
      excluded: sum.excluded + number(source.excluded),
    }),
    { checked: 0, matched: 0, review: 0, excluded: 0 },
  );
  return (
    <section className="briefing-snapshot" aria-labelledby="snapshot-title">
      <div>
        <p className="briefing-label">Latest consolidated snapshot</p>
        <h2 id="snapshot-title">
          {sources.length
            ? `${sources.length} company boards checked`
            : "No completed scan yet"}
        </h2>
        <p>
          {totals.checked
            ? `${totals.checked.toLocaleString()} listings were collected, normalised and checked against your current search brief.`
            : "Run a scan to create the first snapshot."}
        </p>
      </div>
      <dl>
        <div>
          <dt>Ready</dt>
          <dd>{totals.matched}</dd>
        </div>
        <div>
          <dt>Clarify</dt>
          <dd>{totals.review}</dd>
        </div>
        <div>
          <dt>Excluded</dt>
          <dd>{totals.excluded}</dd>
        </div>
      </dl>
    </section>
  );
}
