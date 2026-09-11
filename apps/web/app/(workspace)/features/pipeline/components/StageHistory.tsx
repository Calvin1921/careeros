import type { StageEvent } from "../pipeline.types";

export function StageHistory({ events }: { events: StageEvent[] }) {
  return (
    <section aria-labelledby="stage-history-heading">
      <h2 id="stage-history-heading">Application timeline</h2>
      <ol className="event-list">
        {events.map((event) => (
          <li key={event.id}>
            <time>{new Date(event.created_at).toLocaleString()}</time>
            <div>
              {event.from_stage ? `${event.from_stage} → ` : ""}
              {event.to_stage}
              {event.event_kind === "correction" && (
                <> — correction: {event.reason}</>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
