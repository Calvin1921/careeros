CREATE TABLE IF NOT EXISTS conversation_profile_facts (
  field text PRIMARY KEY CHECK (field IN ('targetRole','experience','skills','location','workStyle','motivation')),
  value text NOT NULL CHECK (length(value) BETWEEN 1 AND 2000),
  evidence text NOT NULL CHECK (length(evidence) BETWEEN 1 AND 4000),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);
