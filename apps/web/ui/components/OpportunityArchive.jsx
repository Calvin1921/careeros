import {
  OpportunityArchiveToolbar,
  SnapshotOpportunityArchive,
} from "./SnapshotOpportunityArchive";
import { LiveJobDetails } from "./LiveJobDetails";
import { useOpportunityArchiveModel } from "../hooks/useOpportunityArchiveModel";
import { useOpportunitySelection } from "../hooks/useOpportunitySelection";
import "./live-discovery.css";

export function OpportunityArchive({ tracker, onPrepare }) {
  const model = useOpportunityArchiveModel(tracker);
  const { selectedJob, selectJob } = useOpportunitySelection(model.jobs);
  return (
    <section className="opportunity-archive-page">
      <header className="opportunity-archive-page__header">
        <div>
          <p className="live-discovery__eyebrow">
            <span className="live-discovery__dot" /> Opportunities
          </p>
          <h1>Review and move applications forward</h1>
          <p>
            Choose a role on the left. Its full context, application status and
            next action stay open on the right.
          </p>
        </div>
      </header>
      <OpportunityArchiveToolbar model={model} />
      <div className="opportunity-browser">
        <div className="opportunity-browser__list">
          <SnapshotOpportunityArchive
            model={model}
            tracker={tracker}
            onSelect={selectJob}
            selectedId={selectedJob?.id}
            compact
          />
        </div>
        <div className="opportunity-browser__detail">
          {selectedJob ? (
            <LiveJobDetails
              embedded
              job={selectedJob}
              application={tracker.recordFor(selectedJob)}
              onStatusChange={(status) =>
                tracker.updateStatus(selectedJob, status)
              }
              onResolveDuplicate={(resolution) =>
                tracker.resolvePriorApplication(selectedJob, resolution)
              }
              onPrepare={() => onPrepare(selectedJob)}
            />
          ) : (
            <div className="opportunity-browser__empty">
              <strong>Select an opportunity</strong>
              <p>
                Choose a role to review its job description and application
                controls.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
