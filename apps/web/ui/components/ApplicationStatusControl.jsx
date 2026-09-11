import { CheckCircle, ClockCounterClockwise } from "@phosphor-icons/react";
import { applicationStatuses } from "../lib/application-status";

function formatHkt(value) {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

export function ApplicationStatusControl({
  record,
  onChange,
  onResolveDuplicate,
}) {
  return (
    <section
      className="application-status"
      aria-labelledby="application-status-title"
    >
      <div>
        <p className="briefing-label">Application tracking</p>
        <h2 id="application-status-title">Where are you with this role?</h2>
        <p>
          Every update becomes part of your funnel history and improves later
          strategy advice.
        </p>
      </div>
      <label>
        Status
        <select
          value={record.status}
          onChange={(event) => onChange(event.target.value)}
        >
          {applicationStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      {record.possibleDuplicate && (
        <div className="application-status__duplicate" role="status">
          <strong>Possible prior application</strong>
          <p>{record.possibleDuplicate.note}</p>
          <div>
            <button
              type="button"
              onClick={() => onResolveDuplicate?.("same-role")}
            >
              Same role · mark applied
            </button>
            <button
              type="button"
              onClick={() => onResolveDuplicate?.("different-role")}
            >
              Different role · clear flag
            </button>
          </div>
        </div>
      )}
      {record.history.length > 0 && (
        <ol>
          {[...record.history].reverse().map((event) => (
            <li key={`${event.status}-${event.occurredAt}`}>
              <CheckCircle size={15} weight="fill" />
              <span>
                <strong>{event.status}</strong>
                <small>
                  <ClockCounterClockwise size={12} />
                  {formatHkt(event.occurredAt)} HKT
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
