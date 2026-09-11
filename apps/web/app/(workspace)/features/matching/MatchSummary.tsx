import type { Evaluation } from "./types";
export function MatchSummary({
  evaluation,
  pending,
  failed,
}: {
  evaluation?: Evaluation;
  pending: boolean;
  failed: boolean;
}) {
  if (pending) return <p className="muted">Loading assessment…</p>;
  if (failed)
    return <p className="muted">Assessment temporarily unavailable.</p>;
  if (!evaluation)
    return <p className="muted">No automated assessment recorded.</p>;
  return (
    <>
      <p
        className={
          evaluation.verdict === "match" ? "match-reason" : "match-gap"
        }
      >
        {evaluation.verdict === "match"
          ? "Matches saved rules"
          : evaluation.verdict === "review"
            ? "Needs review"
            : "Outside saved criteria"}{" "}
        · {evaluation.reasons.join(" · ")}
      </p>
      {evaluation.gaps.length > 0 && (
        <p className="match-gap">{evaluation.gaps.join(" · ")}</p>
      )}
      <small>
        Criteria v{evaluation.criteria_version} · assessed{" "}
        {new Date(evaluation.created_at).toLocaleDateString()}
      </small>
    </>
  );
}
