-- Already Here LLC Revenue Command Spine extension v2
-- Adds canonical source/provenance, route stacking, verified revenue attribution,
-- universal approvals, AI run/outcome lineage, and engineering verification history.

CREATE TABLE IF NOT EXISTS opportunity_sources (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  source_type TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_record_id TEXT,
  source_uri TEXT,
  raw_hash TEXT,
  discovered_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunity_sources_opportunity
  ON opportunity_sources(opportunity_id, discovered_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_sources_identity
  ON opportunity_sources(source_system, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS opportunity_scores (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  score_version TEXT NOT NULL,
  revenue_impact_score INTEGER NOT NULL DEFAULT 0,
  recurring_revenue_score INTEGER NOT NULL DEFAULT 0,
  data_network_score INTEGER NOT NULL DEFAULT 0,
  dependency_score INTEGER NOT NULL DEFAULT 0,
  risk_reduction_score INTEGER NOT NULL DEFAULT 0,
  proof_speed_score INTEGER NOT NULL DEFAULT 0,
  reusable_product_score INTEGER NOT NULL DEFAULT 0,
  composite_score INTEGER NOT NULL DEFAULT 0,
  rationale_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunity_scores_rank
  ON opportunity_scores(composite_score DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS route_stacks (
  id TEXT PRIMARY KEY,
  technician_id TEXT REFERENCES technicians(id),
  route_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_at TEXT NOT NULL,
  stop_ids_json TEXT NOT NULL DEFAULT '[]',
  stops_json TEXT NOT NULL DEFAULT '[]',
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  contribution_margin_cents INTEGER NOT NULL DEFAULT 0,
  total_miles REAL NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_stacks_tech_date
  ON route_stacks(technician_id, route_date, score DESC);

CREATE TABLE IF NOT EXISTS revenue_events (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id),
  invoice_id TEXT REFERENCES invoices(id),
  payment_id TEXT REFERENCES payments(id),
  contact_id TEXT REFERENCES contacts(id),
  ai_action_id TEXT,
  outcome_id TEXT,
  event_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  contribution_margin_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_created
  ON revenue_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_opportunity
  ON revenue_events(opportunity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  authority_scope TEXT NOT NULL DEFAULT 'owner_review',
  decision TEXT NOT NULL,
  note TEXT,
  request_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_target
  ON approval_actions(target_table, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_runs (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  opportunity_id TEXT REFERENCES opportunities(id),
  contact_id TEXT REFERENCES contacts(id),
  input_evidence_json TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT,
  confidence INTEGER NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_opportunity
  ON ai_runs(opportunity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  ai_action_id TEXT,
  ai_run_id TEXT REFERENCES ai_runs(id),
  opportunity_id TEXT REFERENCES opportunities(id),
  outcome_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  realized_revenue_cents INTEGER NOT NULL DEFAULT 0,
  realized_cost_cents INTEGER NOT NULL DEFAULT 0,
  contribution_margin_cents INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outcomes_opportunity
  ON outcomes(opportunity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_ai_action
  ON outcomes(ai_action_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS engineering_events (
  id TEXT PRIMARY KEY,
  repo TEXT,
  branch TEXT,
  commit_sha TEXT,
  pull_request_number INTEGER,
  deployment_id TEXT,
  event_type TEXT NOT NULL,
  state TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_engineering_events_repo_time
  ON engineering_events(repo, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_history (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  verification_type TEXT NOT NULL,
  state TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_target
  ON verification_history(target_type, target_id, verified_at DESC);
