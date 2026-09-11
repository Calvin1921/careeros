CREATE TABLE candidate_profile (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 id uuid NOT NULL UNIQUE,
 full_name text NOT NULL DEFAULT '',
 headline text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 location text NOT NULL DEFAULT '',
 website_url text NOT NULL DEFAULT '',
 linkedin_url text NOT NULL DEFAULT '',
 summary text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cv_imports (
 id uuid PRIMARY KEY,
 source_kind text NOT NULL CHECK (source_kind IN ('paste','text','json')),
 filename text,
 original_text text NOT NULL,
 original_json jsonb,
 source_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile_experiences (
 id uuid PRIMARY KEY,
 import_id uuid REFERENCES cv_imports(id),
 kind text NOT NULL CHECK (kind IN ('experience','education','project','certification','other')),
 employer text NOT NULL DEFAULT '',
 role_title text NOT NULL DEFAULT '',
 start_date text NOT NULL DEFAULT '',
 end_date text NOT NULL DEFAULT '',
 location text NOT NULL DEFAULT '',
 summary text NOT NULL,
 source_refs jsonb NOT NULL DEFAULT '[]',
 unresolved_questions jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed')),
 confirmed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(source_refs) = 'array'),
 CHECK (jsonb_typeof(unresolved_questions) = 'array'),
 CHECK ((status = 'confirmed') = (confirmed_at IS NOT NULL))
);
CREATE INDEX profile_experiences_import ON profile_experiences(import_id, created_at);
CREATE INDEX profile_experiences_status ON profile_experiences(status, updated_at);

CREATE TABLE profile_versions (
 id uuid PRIMARY KEY,
 version_number integer NOT NULL UNIQUE CHECK (version_number > 0),
 profile_snapshot jsonb NOT NULL,
 experience_snapshot jsonb NOT NULL,
 evidence_snapshot jsonb NOT NULL,
 source_import_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(profile_snapshot) = 'object'),
 CHECK (jsonb_typeof(experience_snapshot) = 'array'),
 CHECK (jsonb_typeof(evidence_snapshot) = 'array')
);

ALTER TABLE capabilities ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE evidence ADD COLUMN source_label text NOT NULL DEFAULT '';
ALTER TABLE evidence ADD COLUMN attested_at timestamptz;
ALTER TABLE evidence ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE evidence SET attested_at = created_at WHERE verified = true;

CREATE TABLE learning_milestones (
 id uuid PRIMARY KEY,
 capability_id uuid NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
 title text NOT NULL,
 week_start date NOT NULL,
 weekly_hours numeric(4,1) NOT NULL CHECK (weekly_hours >= 0 AND weekly_hours <= 168),
 practical_evidence_goal text NOT NULL,
 status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in-progress','completed')),
 evidence_id uuid REFERENCES evidence(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_milestones_capability_week ON learning_milestones(capability_id, week_start);
