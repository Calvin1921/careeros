"use client";
import { jobGuide } from "../../lib/career-journey";
import type { Stage } from "@careeros/domain";
import type { useJobActions } from "../../hooks/use-jobs";
export function JobJourney({
  stage,
  section,
  onSection,
  change,
}: {
  stage: Stage;
  section: string;
  onSection: (
    section: "description" | "materials" | "tasks" | "history",
  ) => void;
  change: ReturnType<typeof useJobActions>["stage"];
}) {
  const guide = jobGuide(stage);
  const target = guide.section === "status" ? "history" : guide.section;
  return (
    <>
      <section className="next-step" data-tone={guide.tone}>
        <div>
          <p className="eyebrow">
            {["accepted", "rejected", "withdrawn"].includes(stage)
              ? "YOUR RECORD"
              : "NEXT ACTION"}
          </p>
          <h2>{guide.title}</h2>
          <p>{guide.description}</p>
        </div>
        {stage === "discovered" ? (
          <button
            disabled={change.isPending}
            onClick={() =>
              change.mutate("shortlisted", {
                onSuccess: () => onSection("materials"),
              })
            }
          >
            {change.isPending ? "Saving…" : "Shortlist this role"} →
          </button>
        ) : (
          section !== target && (
            <button onClick={() => onSection(target)}>{guide.label} →</button>
          )
        )}
      </section>
      {change.error && (
        <p className="error" role="alert">
          {change.error.message}
        </p>
      )}
    </>
  );
}
