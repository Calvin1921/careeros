import { ArrowRight, Briefcase, Clock, MapPin } from "@phosphor-icons/react";
import "./job-result-row.css";

export function JobResultRow({
  title,
  company,
  location,
  salary,
  work,
  discoveredAt,
  reason,
  uncertainty,
  status,
  tone = "match",
  selected = false,
  compact = false,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={`job-result-row${compact ? " job-result-row--compact" : ""}${selected ? " is-selected" : ""}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <div className="job-result-row__body">
        <div className="job-result-row__heading">
          <div>
            <p>{company || "Company not recorded"}</p>
            <h2>{title || "Title not recorded"}</h2>
          </div>
          <span
            className={"job-result-row__status job-result-row__status--" + tone}
          >
            {status}
          </span>
        </div>
        <div className="job-result-row__meta">
          {location && (
            <span>
              <MapPin size={15} />
              {location}
            </span>
          )}
          {discoveredAt && (
            <span>
              <Clock size={15} />
              {discoveredAt}
            </span>
          )}
          {work && (
            <span>
              <Briefcase size={15} />
              {work}
            </span>
          )}
          <strong>{salary || "Salary not listed"}</strong>
        </div>
        {reason && <p className="job-result-row__reason">{reason}</p>}
        {uncertainty && (
          <p className="job-result-row__uncertainty">Check: {uncertainty}</p>
        )}
      </div>
      <ArrowRight className="job-result-row__arrow" size={20} />
    </button>
  );
}
