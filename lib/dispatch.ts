export const dispatchFieldLabels = {
  fullName: "Full name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  fullSiteAddress: "Full site address",
  state: "State",
  siteCount: "One site or multi-site",
  travelLikely: "Travel likely",
  requestedDate: "Requested date",
  requestedWindow: "Requested window",
  dueByTime: "Due-by time",
  serviceType: "Service type",
  priority: "Priority",
  ticketReference: "Ticket or reference number",
  onsiteContactName: "Onsite contact name",
  onsiteContactPhone: "Onsite contact phone",
  onsiteContactEmail: "Onsite contact email",
  billingContactName: "Billing contact name",
  billingContactPhone: "Billing contact phone",
  billingContactEmail: "Billing contact email",
  liftRequired: "Lift required",
  toolsRequired: "Tools or staging required",
  oneLineScopeSummary: "One-line scope summary",
  bridgeDetails: "Remote bridge details",
  accessNotes: "Access notes",
  closeoutRequirements: "Closeout requirements",
} as const;

export type DispatchFieldName = keyof typeof dispatchFieldLabels;
export type DispatchFieldErrors = Partial<Record<DispatchFieldName, string>>;

export type DispatchPayload = Record<DispatchFieldName, string>;

export const requiredDispatchFields: DispatchFieldName[] = [
  "fullName",
  "company",
  "email",
  "phone",
  "fullSiteAddress",
  "state",
  "requestedDate",
  "requestedWindow",
  "serviceType",
  "priority",
  "onsiteContactName",
  "onsiteContactPhone",
  "onsiteContactEmail",
  "billingContactName",
  "billingContactPhone",
  "billingContactEmail",
  "oneLineScopeSummary",
];

export const dispatchInitialValues: DispatchPayload = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  fullSiteAddress: "",
  state: "Arizona",
  siteCount: "One site",
  travelLikely: "No",
  requestedDate: "",
  requestedWindow: "",
  dueByTime: "",
  serviceType: "",
  priority: "",
  ticketReference: "",
  onsiteContactName: "",
  onsiteContactPhone: "",
  onsiteContactEmail: "",
  billingContactName: "",
  billingContactPhone: "",
  billingContactEmail: "",
  liftRequired: "No",
  toolsRequired: "No",
  oneLineScopeSummary: "",
  bridgeDetails: "",
  accessNotes: "",
  closeoutRequirements: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhone(value: string) {
  return digitsOnly(value).length >= 10;
}

export function isDispatchFieldName(value: string): value is DispatchFieldName {
  return value in dispatchFieldLabels;
}

export function sanitizeDispatchPayload(input: unknown): DispatchPayload {
  const source = (input ?? {}) as Record<string, unknown>;
  const payload = {} as DispatchPayload;

  for (const key of Object.keys(dispatchFieldLabels) as DispatchFieldName[]) {
    const rawValue = source[key];
    payload[key] = typeof rawValue === "string" ? rawValue.trim() : "";
  }

  payload.email = payload.email.toLowerCase();
  payload.onsiteContactEmail = payload.onsiteContactEmail.toLowerCase();
  payload.billingContactEmail = payload.billingContactEmail.toLowerCase();

  return payload;
}

export function validateDispatchPayload(payload: DispatchPayload) {
  const fieldErrors: DispatchFieldErrors = {};

  if (!payload.fullName) {
    fieldErrors.fullName = "Enter the full name for the person submitting this request.";
  }

  if (!payload.company) {
    fieldErrors.company = "Enter the company name tied to this dispatch request.";
  }

  if (!payload.email) {
    fieldErrors.email = "Enter the requester email address.";
  } else if (!emailPattern.test(payload.email)) {
    fieldErrors.email = "Enter a valid email address for the requester.";
  }

  if (!payload.phone) {
    fieldErrors.phone = "Enter the requester phone number.";
  } else if (!isValidPhone(payload.phone)) {
    fieldErrors.phone = "Enter a phone number with at least 10 digits.";
  }

  if (!payload.fullSiteAddress) {
    fieldErrors.fullSiteAddress = "Enter the full physical site address.";
  }

  if (!payload.state) {
    fieldErrors.state = "Select the state where the work will happen.";
  }

  if (!payload.requestedDate) {
    fieldErrors.requestedDate = "Select the requested service date.";
  }

  if (!payload.requestedWindow) {
    fieldErrors.requestedWindow = "Select the requested arrival window.";
  }

  if (!payload.serviceType) {
    fieldErrors.serviceType = "Select the service type that best matches the work.";
  }

  if (!payload.priority) {
    fieldErrors.priority = "Select the priority for this request.";
  }

  if (!payload.onsiteContactName) {
    fieldErrors.onsiteContactName = "Enter the onsite contact name.";
  }

  if (!payload.onsiteContactPhone) {
    fieldErrors.onsiteContactPhone = "Enter the onsite contact phone number.";
  } else if (!isValidPhone(payload.onsiteContactPhone)) {
    fieldErrors.onsiteContactPhone = "Enter a valid onsite contact phone number.";
  }

  if (!payload.onsiteContactEmail) {
    fieldErrors.onsiteContactEmail = "Enter the onsite contact email address.";
  } else if (!emailPattern.test(payload.onsiteContactEmail)) {
    fieldErrors.onsiteContactEmail = "Enter a valid onsite contact email address.";
  }

  if (!payload.billingContactName) {
    fieldErrors.billingContactName = "Enter the billing contact name.";
  }

  if (!payload.billingContactPhone) {
    fieldErrors.billingContactPhone = "Enter the billing contact phone number.";
  } else if (!isValidPhone(payload.billingContactPhone)) {
    fieldErrors.billingContactPhone = "Enter a valid billing contact phone number.";
  }

  if (!payload.billingContactEmail) {
    fieldErrors.billingContactEmail = "Enter the billing contact email address.";
  } else if (!emailPattern.test(payload.billingContactEmail)) {
    fieldErrors.billingContactEmail = "Enter a valid billing contact email address.";
  }

  if (!payload.oneLineScopeSummary) {
    fieldErrors.oneLineScopeSummary =
      "Enter a one-line scope summary that explains the work to be performed onsite.";
  }

  return {
    fieldErrors,
    invalidFields: Object.keys(fieldErrors) as DispatchFieldName[],
  };
}

export function getDispatchEnvStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
    DISPATCH_FROM_EMAIL: Boolean(env.DISPATCH_FROM_EMAIL),
    DISPATCH_TO_EMAIL: Boolean(env.DISPATCH_TO_EMAIL),
    NEXT_PUBLIC_SITE_URL: Boolean(env.NEXT_PUBLIC_SITE_URL),
  };
}

export function getMissingDispatchEnvVars(env: NodeJS.ProcessEnv = process.env) {
  return Object.entries(getDispatchEnvStatus(env))
    .filter(([, present]) => !present)
    .map(([name]) => name);
}
