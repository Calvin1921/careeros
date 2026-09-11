import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useDialog } from "../hooks/useDialog";

export function CriteriaDialog({ criteria, onSave, onClose }) {
  const [draft, setDraft] = useState(criteria);
  const dialog = useDialog(true, onClose);
  return (
    <div className="editor-backdrop">
      <section
        className="editor"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="criteria-title"
      >
        <div className="panel-head">
          <h2 id="criteria-title">Your search brief</h2>
          <button
            className="icon-button"
            aria-label="Close search brief"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        <p className="muted">
          Start from your experience. Adjust what matters to you.
        </p>
        <div className="brief-evidence">
          <strong>Experience we are working with</strong>
          <p>
            Technical leadership, TypeScript, React, account security, GraphQL
            and AWS services.
          </p>
          <span>
            From your supplied CV · preferences still need your confirmation
          </span>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
            onClose();
          }}
        >
          <label>
            Where would you work?
            <select
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            >
              <option>Hong Kong or worldwide remote</option>
              <option>Hong Kong</option>
              <option>Worldwide remote</option>
            </select>
          </label>
          <label>
            Minimum monthly base salary · HKD
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="Not set — keep the search open"
              value={draft.salaryFloor}
              onChange={(e) =>
                setDraft({ ...draft, salaryFloor: e.target.value })
              }
            />
          </label>
          <p className="fine">
            Unknown pay stays visible for review. We do not assume it meets your
            floor.
          </p>
          <label>
            What should we prioritize?
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
            >
              <option>Best fit</option>
              <option>Higher salary</option>
            </select>
          </label>
          <button className="primary" type="submit">
            Save search brief
          </button>
        </form>
        <p className="fine">
          This prototype stores changes for this session only.
        </p>
      </section>
    </div>
  );
}
