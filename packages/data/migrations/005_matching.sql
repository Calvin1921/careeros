CREATE TABLE matching_criteria_versions (
 version serial PRIMARY KEY,
 rules jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE job_match_evaluations (
 id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES jobs(id),
 snapshot_id uuid NOT NULL REFERENCES job_source_snapshots(id),
 criteria_version integer NOT NULL REFERENCES matching_criteria_versions(version),
 verdict text NOT NULL CHECK(verdict IN ('match','review','excluded')),
 reasons jsonb NOT NULL,
 gaps jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(snapshot_id,criteria_version)
);
CREATE INDEX match_evaluation_job ON job_match_evaluations(job_id,created_at DESC);
