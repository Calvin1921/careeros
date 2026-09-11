import type { SourceSnapshot } from "../pipeline.types";

export function ProvenancePanel({ sources }: { sources: SourceSnapshot[] }) {
  return (
    <section aria-labelledby="source-provenance-heading">
      <h3 id="source-provenance-heading">Saved job sources</h3>
      {sources.length === 0 ? (
        <p className="muted">This role predates source snapshots.</p>
      ) : (
        sources.map((source) => (
          <details key={source.id} className="source-record">
            <summary>
              Imported · {new Date(source.extracted_at).toLocaleString()}
            </summary>
            <dl>
              <div>
                <dt>Original URL</dt>
                <dd>
                  <a
                    href={source.original_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.original_url}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Canonical source link</dt>
                <dd>{source.normalized_url}</dd>
              </div>
              <div>
                <dt>Extraction version</dt>
                <dd>{source.extraction_version}</dd>
              </div>
            </dl>
          </details>
        ))
      )}
    </section>
  );
}
