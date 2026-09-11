import { useState } from "react";
import { Plus, Trash, X } from "@phosphor-icons/react";
import { useDialog } from "../hooks/useDialog";
import { discoverySweepTimes, effectiveSweepTimes } from "../lib/search-rhythm";

export function ScheduleDialog({
  initialTimes = [],
  saving,
  error,
  onSave,
  onClose,
}) {
  const [times, setTimes] = useState(
    effectiveSweepTimes(
      initialTimes.length ? initialTimes : discoverySweepTimes,
    ),
  );
  const dialog = useDialog(true, onClose);
  return (
    <div className="editor-backdrop">
      <section
        className="schedule-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-title"
      >
        <div className="panel-head">
          <div>
            <p className="briefing-label">Automation</p>
            <h2 id="schedule-title">When should CareerOS scan?</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close schedule"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <p className="muted">
          Times use Hong Kong time. Each run adds a snapshot to your briefing.
        </p>
        <div className="schedule-fields">
          {times.map((time, index) => (
            <div key={index}>
              <label>
                <span>
                  {["Morning", "Afternoon", "Evening", "Extra"][index]}
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) =>
                    setTimes((current) =>
                      current.map((value, i) =>
                        i === index ? event.target.value : value,
                      ),
                    )
                  }
                />
              </label>
              <button
                aria-label={`Remove ${time} scan`}
                onClick={() =>
                  setTimes((current) => current.filter((_, i) => i !== index))
                }
              >
                <Trash size={17} />
              </button>
            </div>
          ))}
        </div>
        {times.length < 4 && (
          <button
            className="schedule-add"
            onClick={() => setTimes((current) => [...current, "20:00"])}
          >
            <Plus size={17} /> Add another time
          </button>
        )}
        {error && (
          <p className="schedule-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={saving || !times.length}
            onClick={() => onSave(times)}
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </section>
    </div>
  );
}
