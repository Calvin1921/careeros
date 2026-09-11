import { ArrowRight, ChartLineUp } from "@phosphor-icons/react";

export function FunnelOverview({ metrics, guidance, onOpenOpportunities }) {
  return (
    <section className="funnel-overview" aria-labelledby="funnel-title">
      <div className="funnel-overview__head">
        <div>
          <p className="briefing-label">Search feedback loop</p>
          <h2 id="funnel-title">Application funnel</h2>
        </div>
        <ChartLineUp size={21} />
      </div>
      <div className="funnel-overview__stages">
        <div>
          <strong>{metrics.applied}</strong>
          <span>Applied</span>
        </div>
        <div>
          <strong>{metrics.screens}</strong>
          <span>Screens</span>
        </div>
        <div>
          <strong>{metrics.interviews}</strong>
          <span>Interviews</span>
        </div>
        <div>
          <strong>{metrics.offers}</strong>
          <span>Offers</span>
        </div>
      </div>
      <div className="funnel-overview__guidance">
        <strong>{guidance.title}</strong>
        <p>{guidance.body}</p>
      </div>
      <button onClick={onOpenOpportunities}>
        Update application outcomes <ArrowRight size={15} />
      </button>
    </section>
  );
}
