import type { Artifact } from "../../hooks/use-jobs";
function TextList({ title, value }: { title: string; value: unknown }) {
  if (!Array.isArray(value) || !value.length) return null;
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {value
          .filter((item) => typeof item === "string")
          .map((item, i) => (
            <li key={i}>{item}</li>
          ))}
      </ul>
    </section>
  );
}
export function PreparationDraft({ artifact }: { artifact: Artifact }) {
  const content = artifact.content;
  return (
    <details
      id={`outline-${artifact.id}`}
      className="artifact"
      open={artifact.status !== "ready"}
    >
      <summary>
        {artifact.kind === "application-package"
          ? "Application outline"
          : "Interview preparation"}
        <span className="stage">{artifact.status}</span>
      </summary>
      {artifact.status === "queued" && (
        <p role="status">
          Preparing your draft… This page updates automatically.
        </p>
      )}
      {artifact.status === "failed" && (
        <p className="error">
          {artifact.error || "Preparation failed. Request another draft."}
        </p>
      )}
      {content && (
        <>
          <p className="draft-label">Template draft · review before use</p>
          <TextList title="Preparation checklist" value={content.checklist} />
          <TextList title="CV sections to prepare" value={content.cvOutline} />
          <TextList title="Practice questions" value={content.questions} />
          <TextList title="Decisions" value={content.decisions} />
          {Array.isArray(content.evidence) && (
            <section>
              <h4>Evidence to consider</h4>
              {content.evidence.length ? (
                <ul>
                  {content.evidence.map(
                    (
                      entry: {
                        summary?: string;
                        source_url?: string;
                        kind?: string;
                      },
                      i,
                    ) => (
                      <li key={i}>
                        {entry.summary} <small>({entry.kind})</small>
                        {entry.source_url &&
                          /^https?:\/\//.test(entry.source_url) && (
                            <>
                              {" "}
                              ·{" "}
                              <a
                                href={entry.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Source
                              </a>
                            </>
                          )}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p>
                  No confirmed evidence was available when this draft was
                  created. Add evidence in your profile before relying on career
                  claims.
                </p>
              )}
            </section>
          )}
          {Array.isArray(content.studyPlan) && (
            <section>
              <h4>Topics to prepare</h4>
              <ul>
                {content.studyPlan.map(
                  (entry: { topic?: string; action?: string }, i) => (
                    <li key={i}>
                      <strong>{entry.topic}</strong> — {entry.action}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
          {typeof content.note === "string" && (
            <p className="muted">{content.note}</p>
          )}
        </>
      )}
    </details>
  );
}
