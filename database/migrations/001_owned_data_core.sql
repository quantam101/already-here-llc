BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text,
  organization_type text NOT NULL CHECK (organization_type IN ('client','vendor','partner','prospect','technician_company','internal')),
  website text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked','archived')),
  source text,
  owner_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_legal_name_unique_active
  ON organizations (lower(legal_name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  display_name text,
  email text,
  phone text,
  role_title text,
  contact_type text NOT NULL DEFAULT 'business' CHECK (contact_type IN ('business','client','vendor','technician','prospect','internal')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','do_not_contact','archived')),
  source text,
  consent_status text NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','opted_in','opted_out','contractual')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_unique_active
  ON contacts (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS contacts_organization_idx ON contacts (organization_id);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts (phone);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  lane text NOT NULL,
  title text NOT NULL,
  description text,
  source text NOT NULL,
  source_external_id text,
  service_location jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_value numeric(12,2),
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','emergency')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','qualified','passed','converted','closed','archived')),
  priority text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  ai_confidence numeric(5,4) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  owner_id uuid,
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_dedupe_key_unique_active
  ON leads (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS leads_status_priority_idx ON leads (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_lane_idx ON leads (lane, created_at DESC);

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  lane text NOT NULL,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'qualified' CHECK (stage IN ('qualified','quoted','approved','scheduled','in_progress','completed','invoiced','paid','lost','archived')),
  expected_value numeric(12,2),
  probability numeric(5,4) CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  expected_close_date date,
  next_action text,
  owner_id uuid,
  ai_score numeric(8,4),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS opportunities_stage_value_idx ON opportunities (stage, expected_value DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS opportunities_lane_idx ON opportunities (lane, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  recommendation jsonb NOT NULL,
  rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','passed','expired','executed')),
  approved_by uuid,
  approved_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_actions_review_queue_idx ON ai_actions (approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_actions_entity_idx ON ai_actions (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_action_id uuid REFERENCES ai_actions(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('review','approve','reject','pass','reply','assign','schedule','dispatch','archive','escalate')),
  actor_id uuid,
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_actions_entity_idx ON review_actions (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS route_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date date NOT NULL,
  technician_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','active','completed','cancelled')),
  estimated_miles numeric(10,2),
  estimated_minutes integer,
  estimated_revenue numeric(12,2),
  estimated_cost numeric(12,2),
  optimization_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  route_stack_id uuid REFERENCES route_stacks(id) ON DELETE SET NULL,
  lane text NOT NULL DEFAULT 'field_service',
  service_type text NOT NULL,
  service_location jsonb NOT NULL DEFAULT '{}'::jsonb,
  technician_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  sla_due_at timestamptz,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','approved','assigned','en_route','on_site','completed','cancelled','failed')),
  quoted_amount numeric(12,2),
  estimated_cost numeric(12,2),
  actual_revenue numeric(12,2),
  actual_cost numeric(12,2),
  closeout jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS dispatches_status_schedule_idx ON dispatches (status, scheduled_start);
CREATE INDEX IF NOT EXISTS dispatches_route_stack_idx ON dispatches (route_stack_id);

CREATE TABLE IF NOT EXISTS revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  dispatch_id uuid REFERENCES dispatches(id) ON DELETE SET NULL,
  lane text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('quoted','booked','invoiced','paid','commission','affiliate','refund','expense','adjustment')),
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text,
  external_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenue_events_lane_date_idx ON revenue_events (lane, occurred_at DESC);
CREATE INDEX IF NOT EXISTS revenue_events_opportunity_idx ON revenue_events (opportunity_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_type text NOT NULL CHECK (actor_type IN ('user','agent','system','integration')),
  actor_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_type, actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id bigserial PRIMARY KEY,
  component text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  status text NOT NULL CHECK (status IN ('healthy','degraded','unhealthy','unknown')),
  latency_ms integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_health_component_time_idx ON system_health_snapshots (component, observed_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at_and_version()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'UPDATE' AND NEW.version = OLD.version THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_touch ON organizations;
CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS contacts_touch ON contacts;
CREATE TRIGGER contacts_touch BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS leads_touch ON leads;
CREATE TRIGGER leads_touch BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS opportunities_touch ON opportunities;
CREATE TRIGGER opportunities_touch BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS dispatches_touch ON dispatches;
CREATE TRIGGER dispatches_touch BEFORE UPDATE ON dispatches
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

COMMIT;
