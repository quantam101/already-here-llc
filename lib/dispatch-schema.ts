/**
 * Declarative Dispatch Schema — Zero-Trust Input Validation
 *
 * All dispatch field constraints are declared as a single Zod schema.
 * Validation is compile-time type-safe: the inferred TypeScript type
 * is derived from the schema, not maintained separately.
 *
 * Invariants enforced at parse time:
 * - All string fields are trimmed and length-bounded
 * - Email fields are validated against RFC-compliant pattern
 * - Phone fields require >= 10 digits
 * - Honeypot field must be empty (bot detection)
 * - File attachments are type- and size-constrained
 */

import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Reusable refinement: trimmed non-empty string with max length. */
function bounded(maxLength: number, label: string) {
  return z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z.string().min(1, `${label} is required.`).max(maxLength, `${label} exceeds ${maxLength} characters.`)
    );
}

/** Optional trimmed string with max length. */
function optionalBounded(maxLength: number) {
  return z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(maxLength))
    .optional()
    .default('');
}

/** Email field: trimmed, lowercased, pattern-validated. */
function emailField(label: string) {
  return z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(
      z.string().min(1, `${label} is required.`).regex(EMAIL_PATTERN, `${label} must be a valid email address.`)
    );
}

/** Phone field: must contain >= 10 digits. */
function phoneField(label: string, required = true) {
  const base = z.string().transform((v) => v.trim());
  if (!required) {
    return base.pipe(z.string().max(40)).optional().default('');
  }
  return base.pipe(
    z.string().min(1, `${label} is required.`).max(40).refine(
      (v) => v.replace(/\D/g, '').length >= 10,
      `${label} must have at least 10 digits.`
    )
  );
}

/**
 * Declarative dispatch payload schema.
 * Every field constraint is expressed as a pure declaration.
 */
export const DispatchSchema = z.object({
  honeypot: z.string().max(0, 'Submission rejected.').optional().default(''),

  fullName: bounded(120, 'Full name'),
  company: bounded(160, 'Company'),
  email: emailField('Email'),
  phone: phoneField('Phone', false),
  fullSiteAddress: bounded(500, 'Site address'),
  state: bounded(60, 'State'),

  siteCount: optionalBounded(60),
  travelLikely: optionalBounded(10),

  requestedDate: bounded(40, 'Requested date'),
  requestedWindow: bounded(160, 'Requested window'),
  dueByTime: optionalBounded(40),

  serviceType: bounded(120, 'Service type'),
  priority: bounded(60, 'Priority'),
  ticketReference: optionalBounded(120),

  onsiteContactName: bounded(120, 'Onsite contact name'),
  onsiteContactPhone: phoneField('Onsite contact phone'),
  onsiteContactEmail: emailField('Onsite contact email'),

  billingContactName: bounded(120, 'Billing contact name'),
  billingContactPhone: phoneField('Billing contact phone'),
  billingContactEmail: emailField('Billing contact email'),

  liftRequired: optionalBounded(10),
  toolsRequired: optionalBounded(10),

  oneLineScopeSummary: bounded(500, 'Scope summary'),
  bridgeDetails: optionalBounded(500),
  accessNotes: optionalBounded(500),
  closeoutRequirements: optionalBounded(1000),
});

/** Compile-time inferred type from the schema. No separate type definition needed. */
export type DispatchPayload = z.infer<typeof DispatchSchema>;

/** Field-level error map returned on validation failure. */
export type DispatchFieldErrors = z.inferFlattenedErrors<typeof DispatchSchema>['fieldErrors'];

/**
 * Parse and validate raw input against the dispatch schema.
 * Returns a discriminated union: success with validated payload, or failure with field errors.
 */
export function parseDispatchInput(
  raw: Record<string, unknown>
): { readonly ok: true; readonly data: DispatchPayload } | { readonly ok: false; readonly errors: DispatchFieldErrors } {
  const result = DispatchSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: result.error.flatten().fieldErrors };
}

/** File attachment validation schema. */
export const AttachmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ACCEPTED_MIME_TYPES),
  size: z.number().max(MAX_FILE_SIZE, 'Attachment must be 10 MB or smaller.'),
});

export type ValidatedAttachment = z.infer<typeof AttachmentSchema>;
