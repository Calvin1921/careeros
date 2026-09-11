CREATE TABLE discovery_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 sources jsonb NOT NULL DEFAULT '["cloudflare","stripe","mongodb","datadog","elastic"]',
 schedule_times jsonb NOT NULL DEFAULT '[]',
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO discovery_settings(singleton) VALUES(true);
CREATE TABLE discovery_runs (
 id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','partial','failed')),
 trigger text NOT NULL, schedule_slot text UNIQUE, plan jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
 lease_until timestamptz, attempts integer NOT NULL DEFAULT 0, error text,
 source_results jsonb NOT NULL DEFAULT '[]'
);
CREATE UNIQUE INDEX discovery_one_active ON discovery_runs((true)) WHERE status IN ('queued','running');
CREATE TABLE discovery_source_cache (
 token text PRIMARY KEY, jobs jsonb NOT NULL, company text NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(), etag text
);
CREATE TABLE discovery_results (
 run_id uuid NOT NULL REFERENCES discovery_runs(id), source text NOT NULL, source_job_id text NOT NULL,
 job_id uuid REFERENCES jobs(id), title text NOT NULL, company text NOT NULL, url text NOT NULL,
 location text NOT NULL, salary text NOT NULL, verdict text NOT NULL CHECK(verdict IN ('match','review','excluded')),
 reasons jsonb NOT NULL, gaps jsonb NOT NULL, matched_skills jsonb NOT NULL,
 PRIMARY KEY(run_id,source,source_job_id)
);
