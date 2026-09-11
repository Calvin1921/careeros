CREATE TABLE job_preparation_reviews (
  job_id uuid NOT NULL REFERENCES jobs(id),
  requirement_key text NOT NULL CHECK (length(requirement_key) BETWEEN 1 AND 100),
  requirement_text text NOT NULL CHECK (length(btrim(requirement_text)) BETWEEN 1 AND 500),
  status text NOT NULL CHECK (status IN ('unknown','direct','transferable','gap')),
  evidence_id uuid REFERENCES evidence(id),
  evidence_signature text,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 3000),
  response text NOT NULL DEFAULT '' CHECK (length(response) <= 10000),
  self_rating text CHECK (self_rating IN ('needs-work','ready')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, requirement_key),
  CHECK (
    (status IN ('direct','transferable') AND evidence_id IS NOT NULL AND evidence_signature IS NOT NULL)
    OR (status IN ('unknown','gap') AND evidence_id IS NULL AND evidence_signature IS NULL)
  ),
  CHECK (self_rating IS NULL OR length(btrim(response)) > 0)
);

CREATE TABLE job_preparation_tasks (
  decision_id uuid PRIMARY KEY REFERENCES application_decision_tasks(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id),
  requirement_key text NOT NULL CHECK (length(requirement_key) BETWEEN 1 AND 100),
  requirement_text text NOT NULL CHECK (length(btrim(requirement_text)) BETWEEN 1 AND 500),
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, requirement_key, due_date)
);

CREATE INDEX job_preparation_tasks_job
  ON job_preparation_tasks(job_id, requirement_key, due_date, created_at);
