CREATE TABLE jobs (
 id uuid PRIMARY KEY, company text NOT NULL, title text NOT NULL, url text NOT NULL UNIQUE,
 description text NOT NULL, requirements jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE applications (
 id uuid PRIMARY KEY, job_id uuid NOT NULL UNIQUE REFERENCES jobs(id),
 stage text NOT NULL DEFAULT 'discovered' CHECK(stage IN ('discovered','shortlisted','applied','screening','interview','offer','accepted','rejected','withdrawn')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE stage_events (
 id uuid PRIMARY KEY, application_id uuid NOT NULL REFERENCES applications(id), from_stage text, to_stage text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stage_events_application_time ON stage_events(application_id,created_at);
CREATE TABLE artifacts (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES jobs(id), kind text NOT NULL CHECK(kind IN ('application-package','interview-prep')),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','ready','failed')), content jsonb, error text,
 provenance text NOT NULL DEFAULT 'deterministic-template', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX artifacts_job ON artifacts(job_id,created_at);
CREATE TABLE outbox (
 id uuid PRIMARY KEY REFERENCES artifacts(id), dispatched_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capabilities (
 id uuid PRIMARY KEY, name text NOT NULL, technologies jsonb NOT NULL, transferable_principles jsonb NOT NULL,
 learning_hours integer NOT NULL DEFAULT 0 CHECK(learning_hours>=0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE evidence (
 id uuid PRIMARY KEY, capability_id uuid NOT NULL REFERENCES capabilities(id), kind text NOT NULL CHECK(kind IN ('learning','project','production')),
 summary text NOT NULL, source_url text NOT NULL, verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE agent_runs (
 id uuid PRIMARY KEY, parent_id uuid REFERENCES agent_runs(id), task_kind text NOT NULL, model text, provider text,
 status text NOT NULL, budget_usd numeric(12,6) NOT NULL CHECK(budget_usd>=0), actual_usd numeric(12,6),
 input_reference text, output_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memory_entries (
 id uuid PRIMARY KEY, scope text NOT NULL, source_id text NOT NULL, content text NOT NULL,
 verified boolean NOT NULL DEFAULT false, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memory_scope ON memory_entries(scope,expires_at);
