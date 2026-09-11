"use client";
import { isApplicationProfileReady } from "../../lib/profile-state";
import Link from "next/link";
import { useJob, useJobActions } from "../../hooks/use-jobs";
import { useProfileWorkspace } from "../../profile/use-profile-workspace";
import { interviewPreparationAvailable } from "../../lib/career-journey";
import { PreparationDraft } from "./PreparationDraft";
type Props = {
  job: NonNullable<ReturnType<typeof useJob>["data"]>;
  prepare: ReturnType<typeof useJobActions>["prepare"];
};
export function JobMaterials({ job, prepare }: Props) {
  const profile = useProfileWorkspace();
  const interview = interviewPreparationAvailable(job.stage);
  const kind = interview ? "interview-prep" : "application-package";
  const relevant = job.artifacts.filter((a) => a.kind === kind);
  const latest = relevant[0];
  const ready = Boolean(
    profile.data && isApplicationProfileReady(profile.data),
  );
  const canGenerate = job.stage === "shortlisted" || interview;
  const queued = relevant.some((a) => a.status === "queued");
  return (
    <section className="card" id="materials">
      <p>
        <a href="#practice">Review requirements, evidence & practice answers</a>
      </p>
      <h2>
        {interview
          ? job.stage === "screening"
            ? "Screening preparation"
            : "Interview preparation"
          : "Application materials"}
      </h2>
      {job.stage === "discovered" && (
        <p className="guidance-inline">
          Review the role and shortlist it first. Application preparation
          becomes available when you decide to pursue it.
        </p>
      )}
      {job.stage === "applied" && (
        <p className="guidance-inline">
          Your application is submitted. Keep these materials for reference;
          interview preparation opens when you record a screening or interview
          invitation.
        </p>
      )}
      {canGenerate && (
        <>
          <p className="section-caption">
            {interview
              ? "Build an outline of your introduction, relevant examples, and questions."
              : "Start with an outline based on your confirmed experience, then finish the CV and any requested portfolio or video."}
          </p>
          {profile.isPending ? (
            <p role="status">Checking your profile…</p>
          ) : profile.error ? (
            <p role="alert" className="error">
              {profile.error.message}{" "}
              <button onClick={() => void profile.refetch()}>Retry</button>
            </p>
          ) : !ready && !interview ? (
            <div className="guidance-inline">
              <h3>Confirm your experience first</h3>
              <p>
                Add your name and confirm at least one experience so your
                materials have a reliable source.
              </p>
              <Link className="button" href="/profile">
                Review my profile →
              </Link>
            </div>
          ) : latest?.status === "ready" ? (
            <>
              <button
                onClick={() => {
                  const outline = document.getElementById(
                    `outline-${latest.id}`,
                  ) as HTMLDetailsElement | null;
                  if (outline) {
                    outline.open = true;
                    outline.scrollIntoView({ block: "start" });
                  }
                }}
              >
                Review your outline →
              </button>
              <details className="section-disclosure">
                <summary>More preparation options</summary>
                <button
                  className="secondary"
                  disabled={prepare.isPending || queued}
                  onClick={() => prepare.mutate(kind)}
                >
                  Create another outline
                </button>
              </details>
            </>
          ) : (
            <div className="actions">
              <button
                disabled={prepare.isPending || queued}
                onClick={() => prepare.mutate(kind)}
              >
                {queued
                  ? "Preparing your outline…"
                  : latest?.status === "ready"
                    ? "Create another outline"
                    : interview
                      ? "Prepare for this conversation"
                      : "Create application outline"}
              </button>
            </div>
          )}
          <p className="criteria muted" style={{ marginTop: 18 }}>
            Outlines are a starting point. Finished CV and document exports are
            not available yet.
          </p>
        </>
      )}
      {prepare.error && (
        <p className="error" role="alert">
          {prepare.error.message}
        </p>
      )}
      {relevant.map((artifact) => (
        <PreparationDraft key={artifact.id} artifact={artifact} />
      ))}
      {job.artifacts.some((a) => a.kind !== kind) && (
        <details className="section-disclosure">
          <summary>Earlier preparation</summary>
          {job.artifacts
            .filter((a) => a.kind !== kind)
            .map((artifact) => (
              <PreparationDraft key={artifact.id} artifact={artifact} />
            ))}
        </details>
      )}
      {job.stage === "shortlisted" && latest?.status === "ready" && (
        <div className="guidance-inline">
          <h3>After you finish your materials</h3>
          <p>
            Submit through the original posting. Then use “Update application
            status” to record Applied. Creating an outline does not submit an
            application.
          </p>
          <a
            className="text-link"
            href={job.url}
            target="_blank"
            rel="noreferrer"
          >
            Open application page ↗
          </a>
        </div>
      )}
    </section>
  );
}
