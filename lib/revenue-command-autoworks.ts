import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface AutoWorksIntakeInput {
  opportunityId: string;
  contactId?: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  fuelType?: string;
  vehicleClass?: string;
  location?: string;
  batteryVoltage?: number;
  conditionUponArrival: string;
  insidePhotoRefs?: string[];
  exteriorPhotoRefs?: string[];
  underHoodPhotoRefs?: string[];
  requestedRepair: string;
  repairCategory: string;
  estimateCents?: number;
  observedAt?: string;
}

export interface AutoWorksResult {
  ok: boolean;
  vehicleId?: string;
  repairOrderId?: string;
  proofId?: string;
  blockedReason?: string;
  errors: string[];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function normalizedVin(vin: string): string {
  return vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
}

export function validateAutoWorksScope(fuelType?: string, vehicleClass?: string): string | null {
  const value = `${fuelType || ''} ${vehicleClass || ''}`.toLowerCase();
  if (value.includes('diesel')) return 'Diesel work is outside AutoWorks service scope.';
  if (['semi', 'tractor', 'bus', 'heavy duty', 'heavy-duty', 'construction equipment'].some((term) => value.includes(term))) {
    return 'Heavy-duty/commercial equipment is outside AutoWorks service scope.';
  }
  return null;
}

export async function createAutoWorksIntake(input: AutoWorksIntakeInput): Promise<AutoWorksResult> {
  const opportunity = getRecord('opportunities', input.opportunityId);
  if (!opportunity) return { ok: false, errors: [`Opportunity not found: ${input.opportunityId}`] };
  const scopeError = validateAutoWorksScope(input.fuelType, input.vehicleClass);
  if (scopeError) return { ok: false, blockedReason: scopeError, errors: [] };

  const vin = normalizedVin(input.vin);
  if (vin.length !== 17) return { ok: false, blockedReason: 'VIN must be 17 valid characters.', errors: [] };
  const now = input.observedAt || new Date().toISOString();
  const vehicleId = stableId('vehicle', `${input.contactId || opportunity.contact_id || 'unknown'}:${vin}`);
  const repairOrderId = stableId('repair', `${input.opportunityId}:${vehicleId}:${input.repairCategory}`);
  const proofId = stableId('proof', `${repairOrderId}:arrival`);
  const photoRefs = [...(input.exteriorPhotoRefs || []), ...(input.insidePhotoRefs || []), ...(input.underHoodPhotoRefs || [])];
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'vehicles', id: vehicleId, action: 'insert', record: {
        id: vehicleId,
        contact_id: input.contactId || opportunity.contact_id || null,
        vin,
        year: input.year || null,
        make: input.make || null,
        model: input.model || null,
        mileage: input.mileage || null,
        fuel_scope: (input.fuelType || 'gas_light_duty').toLowerCase(),
        vehicle_class: input.vehicleClass || 'passenger_or_light_duty',
        service_location: input.location || null,
        battery_voltage: input.batteryVoltage ?? null,
        condition_upon_arrival: input.conditionUponArrival,
        photos: photoRefs,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'repair_orders', id: repairOrderId, action: 'insert', record: {
        id: repairOrderId,
        vehicle_id: vehicleId,
        opportunity_id: input.opportunityId,
        repair_category: input.repairCategory,
        requested_repair: input.requestedRepair,
        estimate_cents: Math.max(0, Math.trunc(input.estimateCents || 0)),
        authorization_status: 'pending',
        before_photos: photoRefs,
        after_photos: [],
        status: 'intake_complete_pending_authorization',
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'proof_of_work', id: proofId, action: 'insert', record: {
        id: proofId,
        opportunity_id: input.opportunityId,
        module: 'AutoWorks',
        proof_type: 'vehicle_arrival_condition',
        evidence: {
          vehicle_id: vehicleId,
          vin,
          location: input.location || null,
          battery_voltage: input.batteryVoltage ?? null,
          condition_upon_arrival: input.conditionUponArrival,
          inside_photos: input.insidePhotoRefs || [],
          exterior_photos: input.exteriorPhotoRefs || [],
          under_hood_photos: input.underHoodPhotoRefs || []
        },
        outcome_summary: 'Vehicle intake documented before repair work begins.',
        reusable_product_candidate: 1,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'audit_logs', id: stableId('audit', `${repairOrderId}:intake`), action: 'insert', record: {
        id: stableId('audit', `${repairOrderId}:intake`),
        actor: 'autoworks_intake',
        action: 'document_vehicle_arrival',
        target_table: 'repair_orders',
        target_id: repairOrderId,
        risk_level: 'medium',
        allowed: 1,
        reason: 'Arrival condition and required evidence recorded before work authorization.',
        created_at: now,
        updated_at: now
      }
    }
  ];
  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, vehicleId, repairOrderId, proofId, errors: result.errors };
}

export async function updateAutoWorksAuthorization(
  repairOrderId: string,
  approved: boolean,
  actorId: string,
  afterPhotoRefs: string[] = [],
  completed = false
): Promise<AutoWorksResult> {
  const repair = getRecord('repair_orders', repairOrderId);
  if (!repair) return { ok: false, errors: [`Repair order not found: ${repairOrderId}`] };
  const now = new Date().toISOString();
  if (completed && !approved && repair.authorization_status !== 'approved') {
    return { ok: false, blockedReason: 'Repair cannot be completed without approved authorization.', errors: [] };
  }
  const authorizationStatus = approved ? 'approved' : 'declined';
  const status = completed ? 'completed' : approved ? 'authorized' : 'declined';
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'repair_orders', id: repairOrderId, action: 'insert', record: {
        ...repair,
        authorization_status: authorizationStatus,
        authorized_by: actorId,
        authorized_at: now,
        status,
        after_photos: afterPhotoRefs.length ? afterPhotoRefs : repair.after_photos || [],
        completed_at: completed ? now : repair.completed_at || null,
        updated_at: now
      }
    },
    {
      table: 'audit_logs', id: stableId('audit', `${repairOrderId}:${status}:${now}`), action: 'insert', record: {
        id: stableId('audit', `${repairOrderId}:${status}:${now}`),
        actor: actorId,
        action: completed ? 'complete_autoworks_repair' : approved ? 'approve_autoworks_repair' : 'decline_autoworks_repair',
        target_table: 'repair_orders',
        target_id: repairOrderId,
        risk_level: 'high',
        allowed: 1,
        reason: `AutoWorks repair authorization changed to ${authorizationStatus}; status ${status}.`,
        created_at: now,
        updated_at: now
      }
    }
  ];
  if (completed) {
    writes.push({
      table: 'proof_of_work', id: stableId('proof', `${repairOrderId}:closeout:${now}`), action: 'insert', record: {
        id: stableId('proof', `${repairOrderId}:closeout:${now}`),
        opportunity_id: repair.opportunity_id || null,
        module: 'AutoWorks',
        proof_type: 'repair_closeout',
        evidence: { repair_order_id: repairOrderId, after_photos: afterPhotoRefs },
        outcome_summary: 'Authorized AutoWorks repair completed with closeout evidence.',
        reusable_product_candidate: 1,
        created_at: now,
        updated_at: now
      }
    });
  }
  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, vehicleId: String(repair.vehicle_id || ''), repairOrderId, errors: result.errors };
}
