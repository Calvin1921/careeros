"use client";

import { requirementTaskTitle } from "../pipeline.presentation";
import type { Decision } from "../pipeline.types";
import { useDecisionMutations } from "../usePipeline";

export function RequirementsChecklist({
  jobId,
  requirements,
  decisions,
  onChanged,
}: {
  jobId: string;
  requirements: string[];
  decisions: Decision[];
  onChanged?: () => void;
}) {
  const { create } = useDecisionMutations(jobId, onChanged);
  return (
    <section aria-labelledby="requirements-heading">
      <h3 id="requirements-heading">Requirements to verify</h3>
      {create.error && (
        <p className="error" role="alert">
          {create.error.message}
        </p>
      )}
      {requirements.length === 0 ? (
        <p className="muted">No application requirements are recorded yet.</p>
      ) : (
        <ul>
          {requirements.map((requirement, index) => {
            const taskTitle = requirementTaskTitle(requirement);
            const tracked = decisions.some(
              (decision) => decision.title === taskTitle,
            );
            return (
              <li key={index} style={{ marginBottom: 8 }}>
                {requirement}{" "}
                <button
                  type="button"
                  className="secondary"
                  disabled={create.isPending || tracked}
                  onClick={() =>
                    create.mutate({ title: taskTitle, dueDate: null })
                  }
                >
                  {tracked ? "Tracked" : "Track this"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
