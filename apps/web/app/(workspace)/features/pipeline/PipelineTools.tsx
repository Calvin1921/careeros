"use client";

import { DecisionTasks } from "./components/DecisionTasks";
import { ProvenancePanel } from "./components/ProvenancePanel";
import { RequirementsChecklist } from "./components/RequirementsChecklist";
import { StageCorrection } from "./components/StageCorrection";
import { StageHistory } from "./components/StageHistory";
import { usePipeline } from "./usePipeline";

export function PipelineTools({
  jobId,
  onChanged,
  view = "tasks",
}: {
  jobId: string;
  onChanged?: () => void;
  view?: "tasks" | "history";
}) {
  const pipeline = usePipeline(jobId);
  if (pipeline.isPending) return <p role="status">Loading next actions…</p>;
  if (pipeline.isError)
    return (
      <div className="error" role="alert">
        {pipeline.error.message}{" "}
        <button className="secondary" onClick={() => void pipeline.refetch()}>
          Refresh
        </button>
      </div>
    );

  return (
    <section>
      {view === "tasks" ? (
        <>
          <DecisionTasks
            jobId={jobId}
            decisions={pipeline.data.decisions}
            onChanged={onChanged}
          />
          <RequirementsChecklist
            jobId={jobId}
            requirements={pipeline.data.requirements}
            decisions={pipeline.data.decisions}
            onChanged={onChanged}
          />
        </>
      ) : (
        <>
          <StageHistory events={pipeline.data.events} />
          <ProvenancePanel sources={pipeline.data.sources} />
          <details className="section-disclosure">
            <summary>Correct a recorded stage</summary>
            <StageCorrection
              jobId={jobId}
              stage={pipeline.data.stage}
              onChanged={onChanged}
            />
          </details>
        </>
      )}
    </section>
  );
}
