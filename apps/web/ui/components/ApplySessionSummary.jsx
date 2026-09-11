import {
  ArrowRight,
  Clock,
  Lightning,
  ShieldCheck,
} from "@phosphor-icons/react";
import { applicationReadiness } from "../lib/application-readiness";
import { isQuickApply } from "../lib/application-lane";
import "./apply-session-summary.css";

export function ApplySessionSummary({ jobs, onStart }) {
  const actionable = jobs.filter(
    (job) => applicationReadiness(job).kind !== "evidence-gap" && job.url,
  );
  const quick = actionable.filter(isQuickApply);
  const held = jobs.filter(
    (job) => applicationReadiness(job).kind === "evidence-gap",
  );
  const sessionTarget = Math.min(4, actionable.length);
  return (
    <section className="apply-session" aria-labelledby="apply-session-title">
      <div className="apply-session__lead">
        <p className="briefing-label">Your next move</p>
        <h2 id="apply-session-title">
          Complete {sessionTarget} applications in the next 90 minutes
        </h2>
        <p>
          The latest snapshot widened discovery first, then did the expensive
          checks here. Start with credible, low-effort roles; the system keeps
          unsupported AI stretches out of your immediate queue.
        </p>
        <button onClick={onStart}>
          Start apply session <ArrowRight size={18} />
        </button>
      </div>
      <dl>
        <div>
          <Lightning size={18} />
          <dt>Ready or one check away</dt>
          <dd>{actionable.length}</dd>
        </div>
        <div>
          <Clock size={18} />
          <dt>Quick applications</dt>
          <dd>{quick.length}</dd>
        </div>
        <div>
          <ShieldCheck size={18} />
          <dt>Evidence stretches held</dt>
          <dd>{held.length}</dd>
        </div>
      </dl>
      <footer>
        <strong>7-day test:</strong> 15+ plausible roles and 8–15 applications
        per day. Diagnose CV or interview performance only after enough outcomes
        exist.
      </footer>
    </section>
  );
}
