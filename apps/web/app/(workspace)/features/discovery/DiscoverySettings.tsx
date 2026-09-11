"use client";
import type { DiscoveryOverview } from "./types";
import type { useDiscovery } from "../../hooks/use-discovery";
export function DiscoverySettings({
  value,
  mutation,
}: {
  value: DiscoveryOverview["settings"];
  mutation: ReturnType<typeof useDiscovery>["settings"];
}) {
  return (
    <details className="card">
      <summary>
        Sources & schedule{" "}
        <span className="muted">
          {value.sources.length} company boards ·{" "}
          {value.schedule_times.length
            ? value.schedule_times.join(", ") + " HKT"
            : "Manual scans"}
        </span>
      </summary>
      <form
        key={value.updated_at}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          mutation.mutate({
            sources: String(data.get("sources"))
              .split(/[\n,]/)
              .map((x) => x.trim())
              .filter(Boolean),
            scheduleTimes:
              data.get("scheduled") === "on"
                ? String(data.get("times"))
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                : [],
          });
        }}
      >
        <label>
          Company career boards
          <small>
            Public Greenhouse board names, one per line. You can replace these
            starting sources with companies you want to follow.
          </small>
          <textarea
            name="sources"
            rows={5}
            defaultValue={value.sources.join("\n")}
            required
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="scheduled"
            defaultChecked={Boolean(value.schedule_times.length)}
          />
          <span>
            Scan automatically every day
            <small>CareerOS and the scan worker must remain running.</small>
          </span>
        </label>
        <label>
          Scan times · Hong Kong time
          <small>Up to four times, separated by commas.</small>
          <input
            name="times"
            defaultValue={
              value.schedule_times.length
                ? value.schedule_times.join(", ")
                : "09:00, 14:00, 19:00"
            }
          />
        </label>
        <button className="secondary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save sources & schedule"}
        </button>
        {mutation.error && (
          <p role="alert" className="error">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p role="status" className="notice">
            Discovery settings saved.
          </p>
        )}
      </form>
    </details>
  );
}
