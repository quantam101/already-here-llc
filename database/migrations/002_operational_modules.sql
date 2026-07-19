BEGIN;

CREATE TABLE IF NOT EXISTS service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country_code char(2) NOT NULL DEFAULT 'US',
  latitude numeric(9,6),
  longitude numeric(9,6),
  access_notes text,
  timezone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS service_locations_org_idx ON service_locations (organization_id, city, state);
CREATE INDEX IF NOT EXISTS service_locations_geo_idx ON service_locations (latitude, longitude);

CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  technician_type text NOT NULL DEFAULT 'contractor' CHECK (technician_type IN ('owner','employee','contractor','partner')),
  home_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','offline','suspended','archived')),
  hourly_floor numeric(12,2),
  two_hour_minimum boolean NOT NULL DEFAULT true,
  travel_radius_miles integer,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS technicians_status_idx ON technicians (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS technicians_org_idx ON technicians (organization_id);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  service_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  asset_tag text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','repair','retired','archived')),
  installed_at timestamptz,
  warranty_expires_at date,
  last_service_at timestamptz,
  next_service_due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_unique_active
  ON assets (lower(serial_number))
  WHERE serial_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS assets_location_idx ON assets (service_location_id, asset_type);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  vin char(17),
  year integer CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
  make text,
  model text,
  trim text,
  license_plate text,
  odometer integer CHECK (odometer IS NULL OR odometer >= 0),
  fuel_type text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_service','out_of_service','sold','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_unique_active
  ON vehicles (vin)
  WHERE vin IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  dispatch_id uuid REFERENCES dispatches(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  service_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  lane text NOT NULL,
  work_order_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','scheduled','in_progress','blocked','completed','cancelled','archived')),
  authorization_status text NOT NULL DEFAULT 'pending' CHECK (authorization_status IN ('pending','approved','rejected','not_required')),
  quoted_amount numeric(12,2),
  approved_amount numeric(12,2),
  actual_revenue numeric(12,2),
  actual_cost numeric(12,2),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  closeout jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS work_orders_number_unique_active
  ON work_orders (work_order_number)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS work_orders_status_lane_idx ON work_orders (status, lane, scheduled_start);

CREATE TABLE IF NOT EXISTS procurement_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  solicitation_number text,
  title text NOT NULL,
  buyer_name text,
  source_url text,
  source text NOT NULL,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('RFI','RFQ','RFP','IFB','grant','registration','renewal','subcontract')),
  stage text NOT NULL DEFAULT 'discovered' CHECK (stage IN ('discovered','screening','go','no_go','drafting','submitted','shortlisted','awarded','lost','expired','archived')),
  due_at timestamptz,
  estimated_value numeric(14,2),
  fit_score numeric(8,4),
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  certifications_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  owner_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS procurement_source_number_unique_active
  ON procurement_opportunities (source, solicitation_number)
  WHERE solicitation_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS procurement_due_stage_idx ON procurement_opportunities (stage, due_at);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('service','digital_download','template','training','ai_agent','affiliate_offer','subscription','retainer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive','archived')),
  price numeric(12,2),
  currency char(3) NOT NULL DEFAULT 'USD',
  recurring_interval text CHECK (recurring_interval IS NULL OR recurring_interval IN ('one_time','monthly','quarterly','annual')),
  fulfillment_url text,
  affiliate_program text,
  affiliate_url text,
  commission_rate numeric(7,4),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_active
  ON products (sku)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  external_order_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','fulfilled','refunded','cancelled','failed')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount numeric(12,2) NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_orders_status_date_idx ON product_orders (status, ordered_at DESC);
CREATE INDEX IF NOT EXISTS product_orders_contact_idx ON product_orders (contact_id, ordered_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  document_type text NOT NULL,
  title text NOT NULL,
  storage_provider text NOT NULL,
  storage_key text NOT NULL,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  checksum_sha256 text,
  classification text NOT NULL DEFAULT 'internal' CHECK (classification IN ('public','internal','confidential','restricted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS documents_storage_unique_active
  ON documents (storage_provider, storage_key)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS documents_entity_idx ON documents (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,
  lane text,
  entity_type text,
  entity_id text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  session_id text,
  source text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON analytics_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_lane_time_idx ON analytics_events (lane, occurred_at DESC);

DROP TRIGGER IF EXISTS service_locations_touch ON service_locations;
CREATE TRIGGER service_locations_touch BEFORE UPDATE ON service_locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS technicians_touch ON technicians;
CREATE TRIGGER technicians_touch BEFORE UPDATE ON technicians
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS assets_touch ON assets;
CREATE TRIGGER assets_touch BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS vehicles_touch ON vehicles;
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS work_orders_touch ON work_orders;
CREATE TRIGGER work_orders_touch BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS procurement_opportunities_touch ON procurement_opportunities;
CREATE TRIGGER procurement_opportunities_touch BEFORE UPDATE ON procurement_opportunities
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

DROP TRIGGER IF EXISTS products_touch ON products;
CREATE TRIGGER products_touch BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

COMMIT;
