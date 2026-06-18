-- Already Here LLC Revenue Command Spine
-- Purpose: owned core asset layer for leads, contacts, opportunities, jobs, agents, proof-of-work, analytics, audit, and operating intelligence.
-- External sends, credential changes, deployments, submissions, live trades, and money movement remain approval-gated outside this schema.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  source TEXT NOT NULL,
  service_area TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role_title TEXT,
  source TEXT NOT NULL,
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  organization_id TEXT REFERENCES organizations(id),
  source_channel TEXT NOT NULL,
  lane TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  raw_payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  lane TEXT NOT NULL,
  revenue_lane_supported TEXT NOT NULL,
  estimated_value_cents INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL CHECK(priority IN ('P0','P1','P2')),
  score INTEGER NOT NULL DEFAULT 0,
  blocker TEXT,
  next_action TEXT NOT NULL,
  status TEXT NOT NULL,
  recommended_follow_up_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id),
  job_type TEXT NOT NULL,
  site_address TEXT,
  scheduled_start TEXT,
  scheduled_end TEXT,
  status TEXT NOT NULL,
  closeout_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispatches (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  technician_id TEXT,
  vendor_id TEXT,
  dispatch_status TEXT NOT NULL,
  skill_match_score INTEGER NOT NULL DEFAULT 0,
  route_fit_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  service_area TEXT,
  skills_json TEXT NOT NULL DEFAULT '[]',
  certifications_json TEXT NOT NULL DEFAULT '[]',
  availability_status TEXT NOT NULL DEFAULT 'unknown',
  performance_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  vendor_type TEXT NOT NULL,
  portal_url TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  compliance_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  mileage INTEGER,
  fuel_scope TEXT NOT NULL DEFAULT 'gas_light_duty',
  photos_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS repair_orders (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  opportunity_id TEXT REFERENCES opportunities(id),
  repair_category TEXT NOT NULL,
  estimate_cents INTEGER NOT NULL DEFAULT 0,
  authorization_status TEXT NOT NULL DEFAULT 'pending',
  before_photos_json TEXT NOT NULL DEFAULT '[]',
  after_photos_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hauling_jobs (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id),
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT,
  load_type TEXT NOT NULL,
  estimated_value_cents INTEGER NOT NULL DEFAULT 0,
  estimated_miles REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  route_date TEXT NOT NULL,
  route_lane TEXT NOT NULL,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  total_miles REAL NOT NULL DEFAULT 0,
  route_score INTEGER NOT NULL DEFAULT 0,
  job_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS procurement_targets (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  target_type TEXT NOT NULL,
  portal_url TEXT,
  deadline_date TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'needs_review',
  submission_status TEXT NOT NULL DEFAULT 'blocked_pending_owner_approval',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  proof_status TEXT NOT NULL DEFAULT 'not_proven',
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  partner_name TEXT NOT NULL,
  tracking_url TEXT,
  commission_model TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  contact_id TEXT REFERENCES contacts(id),
  channel TEXT NOT NULL,
  transcript TEXT,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT,
  persisted_externally INTEGER NOT NULL DEFAULT 0,
  approval_required INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revenue_agents (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  name TEXT NOT NULL,
  operation TEXT NOT NULL UNIQUE,
  run_policy TEXT NOT NULL DEFAULT 'one_agent_one_task',
  execution_scope TEXT NOT NULL DEFAULT 'local_proof_only',
  handoff_to TEXT NOT NULL,
  blocked_external_actions_json TEXT NOT NULL DEFAULT '[]',
  allowed_local_actions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_actions (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES revenue_agents(id),
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result_json TEXT,
  persisted_externally INTEGER NOT NULL DEFAULT 0,
  approval_required INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  page_path TEXT,
  module TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  conversion_value_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  risk_level TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proof_of_work (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id),
  module TEXT NOT NULL,
  proof_type TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  outcome_summary TEXT,
  reusable_product_candidate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS codex_changelog (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  commit_sha TEXT,
  deployment_id TEXT,
  change_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catch_correct_events (
  id TEXT PRIMARY KEY,
  source_module TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  issue_summary TEXT NOT NULL,
  correction_rule TEXT NOT NULL,
  severity TEXT NOT NULL,
  reused_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_health_signals (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  repo_or_service TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  state TEXT NOT NULL,
  severity TEXT NOT NULL,
  next_fix TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lane_status ON leads(lane, status);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_agent ON ai_actions(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_agents_record ON revenue_agents(record_id);
CREATE INDEX IF NOT EXISTS idx_analytics_module_action ON analytics_events(module, action);
CREATE INDEX IF NOT EXISTS idx_health_platform_state ON system_health_signals(platform, state);
