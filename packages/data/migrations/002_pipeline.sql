ALTER TABLE jobs ADD COLUMN normalized_url text;

CREATE UNIQUE INDEX jobs_normalized_url_unique
  ON jobs(normalized_url)
  WHERE normalized_url IS NOT NULL;

CREATE TABLE job_source_snapshots (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id),
  adapter text NOT NULL,
  original_url text NOT NULL,
  normalized_url text NOT NULL,
  extracted_at timestamptz NOT NULL,
  extraction_version text NOT NULL,
  payload jsonb NOT NULL,
  snapshot_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_source_snapshots_job_time
  ON job_source_snapshots(job_id, extracted_at DESC, created_at DESC);

CREATE TABLE application_decision_tasks (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 500),
  due_date date,
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX application_decision_tasks_open_due
  ON application_decision_tasks(due_date, created_at)
  WHERE completed_at IS NULL;

ALTER TABLE stage_events
  ADD COLUMN event_kind text NOT NULL DEFAULT 'transition'
    CHECK (event_kind IN ('transition', 'correction')),
  ADD COLUMN reason text;

ALTER TABLE stage_events
  ADD CONSTRAINT stage_events_correction_reason
  CHECK (
    event_kind = 'transition'
    OR nullif(btrim(reason), '') IS NOT NULL
  );
