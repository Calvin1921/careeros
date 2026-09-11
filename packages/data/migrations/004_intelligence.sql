ALTER TABLE memory_entries
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN confirmed_at timestamptz,
  ADD COLUMN correction_source_id text;

UPDATE memory_entries
SET confirmed_at=created_at
WHERE verified=true AND confirmed_at IS NULL;

ALTER TABLE memory_entries
  ADD CONSTRAINT memory_scope_not_blank CHECK (length(btrim(scope)) BETWEEN 1 AND 200),
  ADD CONSTRAINT memory_source_not_blank CHECK (length(btrim(source_id)) BETWEEN 1 AND 500),
  ADD CONSTRAINT memory_content_not_blank CHECK (length(btrim(content)) BETWEEN 1 AND 10000),
  ADD CONSTRAINT memory_correction_source_not_blank CHECK (
    correction_source_id IS NULL OR length(btrim(correction_source_id)) BETWEEN 1 AND 500
  ),
  ADD CONSTRAINT memory_confirmation_consistent CHECK (
    (verified = false AND confirmed_at IS NULL) OR
    (verified = true AND confirmed_at IS NOT NULL)
  );

CREATE INDEX memory_active_scope
  ON memory_entries(scope,verified,updated_at DESC)
  WHERE expires_at IS NULL;
