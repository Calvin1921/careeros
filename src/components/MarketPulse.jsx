import { ChartLineUp, Database, Target } from "@phosphor-icons/react";
import { marketIntelligence } from "../lib/market-intelligence";
import "./market-pulse.css";

export function MarketPulse({ discovery, selectedJobs }) {
  const market = marketIntelligence({
    run: discovery.run,
    total: discovery.total,
    loadedResults: discovery.results,
    selectedJobs,
  });
  return (
    <section className="market-pulse" aria-labelledby="market-pulse-title">
      <header>
        <div>
          <p className="briefing-label">Market intelligence</p>
          <h2 id="market-pulse-title">What the search is teaching us</h2>
        </div>
        <ChartLineUp size={23} />
      </header>
      <div className="market-pulse__metrics">
        <div>
          <Database size={18} />
          <strong>{market.retained.toLocaleString()}</strong>
          <span>Listings retained</span>
        </div>
        <div>
          <Target size={18} />
          <strong>{market.selected}</strong>
          <span>Selected to pursue</span>
        </div>
        <div>
          <strong>{market.yieldPercent}%</strong>
          <span>Selection yield</span>
        </div>
      </div>
      <p className="market-pulse__explanation">
        The other {market.notSelected.toLocaleString()} listings remain useful
        market evidence. They should inform coverage, demand patterns and
        capability decisions instead of disappearing.
      </p>
      <div className="market-pulse__signals">
        <div>
          <h3>Demand signals in the loaded sample</h3>
          {market.skills.length ? (
            <ul>
              {market.skills.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Skill demand will appear as more retained listings are normalized.
            </p>
          )}
        </div>
        <div>
          <h3>Repeated constraints in your shortlist</h3>
          {market.gaps.length ? (
            <ul>
              {market.gaps.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No repeated constraint has enough evidence yet.</p>
          )}
        </div>
      </div>
      <div className="market-pulse__decision">
        <strong>Search decision</strong>
        <p>{market.recommendation}</p>
      </div>
    </section>
  );
}
