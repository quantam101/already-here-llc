BEGIN;

CREATE TABLE IF NOT EXISTS service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'service_site' CHECK (location_type IN ('service_site','billing','pickup','dropoff','warehouse','office','home','other')),
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2) NOT NULL DEFAULT 'US',
  latitude numeric(9,6),
  longitude numeric(9,6),
  access_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS service_locations_org_idx ON service_locations (organization_id, city, region);

CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  technician_type text NOT NULL DEFAULT 'contractor' CHECK (technician_type IN ('owner','employee','contractor','partner')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','unavailable','inactive','blocked')),
  home_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  skills text[] NOT NULL DEFAULT '{}',
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_radius_miles integer CHECK (service_radius_miles IS NULL OR service_radius_miles >= 0),
  hourly_cost numeric(12,2),
  rating numeric(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  completed_jobs integer NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS technicians_status_idx ON technicians (status, rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS technicians_skills_gin_idx ON technicians USING gin (skills);

ALTER TABLE route_stacks
  ADD CONSTRAINT route_stacks_technician_fk
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL;
ALTER TABLE dispatches
  ADD CONSTRAINT dispatches_technician_fk
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  asset_tag text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','repair','retired','disposed')),
  installed_at date,
  warranty_expires_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_unique_active ON assets (lower(serial_number)) WHERE serial_number IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  vin char(17),
  year integer CHECK (year IS NULL OR year BETWEEN 1900 AND 2200),
  make text,
  model text,
  trim text,
  license_plate text,
  odometer integer CHECK (odometer IS NULL OR odometer >= 0),
  fuel_type text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','sold','scrapped')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_unique_active ON vehicles (vin) WHERE vin IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  dispatch_id uuid REFERENCES dispatches(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  inspection_type text NOT NULL DEFAULT 'arrival',
  condition_summary text,
  battery_voltage numeric(5,2),
  odometer integer CHECK (odometer IS NULL OR odometer >= 0),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_signature text,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  dispatch_id uuid REFERENCES dispatches(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  lane text NOT NULL,
  title text NOT NULL,
  scope text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','scheduled','in_progress','blocked','completed','cancelled')),
  labor_amount numeric(12,2),
  material_amount numeric(12,2),
  total_amount numeric(12,2),
  authorization jsonb NOT NULL DEFAULT '{}'::jsonb,
  closeout jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS work_orders_lane_status_idx ON work_orders (lane, status, created_at DESC);

CREATE TABLE IF NOT EXISTS hauling_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  pickup_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  dropoff_location_id uuid REFERENCES service_locations(id) ON DELETE SET NULL,
  route_stack_id uuid REFERENCES route_stacks(id) ON DELETE SET NULL,
  item_description text NOT NULL,
  estimated_weight_lbs numeric(12,2),
  actual_weight_lbs numeric(12,2),
  quoted_amount numeric(12,2),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','approved','scheduled','picked_up','delivered','cancelled','failed')),
  proof_of_delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_pickup timestamptz,
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS hauling_jobs_status_schedule_idx ON hauling_jobs (status, scheduled_pickup);

CREATE TABLE IF NOT EXISTS procurement_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  solicitation_number text,
  title text NOT NULL,
  buyer_name text,
  source_url text,
  procurement_type text NOT NULL CHECK (procurement_type IN ('RFI','RFQ','RFP','IFB','grant','subcontract','vendor_registration','other')),
  status text NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','review','go','no_go','preparing','submitted','awarded','lost','cancelled','archived')),
  due_at timestamptz,
  estimated_value numeric(14,2),
  fit_score numeric(5,2) CHECK (fit_score IS NULL OR (fit_score >= 0 AND fit_score <= 100)),
  owner_id uuid,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_action text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS procurement_due_status_idx ON procurement_opportunities (status, due_at);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('service','digital_download','template','training','ai_agent','affiliate_offer','retainer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive','archived')),
  price numeric(12,2),
  currency char(3) NOT NULL DEFAULT 'USD',
  fulfillment_url text,
  affiliate_network text,
  affiliate_external_id text,
  commission_rate numeric(7,4),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_active ON products (lower(sku)) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  external_order_id text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  gross_amount numeric(12,2) NOT NULL,
  commission_amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','fulfilled','refunded','cancelled')),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_orders_status_date_idx ON product_orders (status, ordered_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  document_type text NOT NULL,
  name text NOT NULL,
  storage_provider text NOT NULL,
  storage_key text NOT NULL,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  sha256 text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','internal','client','public')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS documents_entity_idx ON documents (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,
  session_id text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  source text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON analytics_events (event_name, occurred_at DESC);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['service_locations','technicians','assets','vehicles','work_orders','hauling_jobs','procurement_opportunities','products']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version()', table_name, table_name);
  END LOOP;
END $$;

COMMIT;
