import { Clock, GearSix } from "@phosphor-icons/react";
import { dailyApplyQueueTime, discoverySweepTimes } from "../lib/search-rhythm";

export function ScheduledScans({ times = [], onManage }) {
  const sweepTimes = times.length ? times : discoverySweepTimes;
  return (
    <section className="scheduled-scans" aria-labelledby="scheduled-title">
      <div className="briefing-section-heading">
        <div>
          <p className="briefing-label">Automation</p>
          <h2 id="scheduled-title">Search rhythm</h2>
        </div>
        <Clock size={20} />
      </div>
      <ol>
        {sweepTimes.map((time, index) => (
          <li key={`${time}-${index}`}>
            <span>
              {[
                "Discovery sweep",
                "Discovery sweep",
                "Discovery sweep",
                "Extra sweep",
              ][index] || "Discovery sweep"}
            </span>
            <strong>{time} HKT</strong>
          </li>
        ))}
        <li>
          <span>Daily apply queue</span>
          <strong>{dailyApplyQueueTime} HKT</strong>
        </li>
      </ol>
      <button className="briefing-secondary" onClick={onManage}>
        <GearSix size={17} /> Manage schedule
      </button>
    </section>
  );
}
