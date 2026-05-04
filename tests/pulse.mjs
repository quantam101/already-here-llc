const payload = {
  fullName: "Live Verification",
  company: "Already Here LLC",
  email: "pulse@example.com",
  phone: "6025550100",
  fullSiteAddress: "Phoenix AZ verification pulse only",
  state: "Arizona",
  siteCount: "One site",
  travelLikely: "No",
  requestedDate: "2026-05-05",
  requestedWindow: "Business hours",
  dueByTime: "End of day",
  serviceType: "Verification",
  priority: "Normal",
  ticketReference: "PULSE",
  onsiteContactName: "Verification",
  onsiteContactPhone: "6025550101",
  onsiteContactEmail: "pulse@example.com",
  billingContactName: "Verification",
  billingContactPhone: "6025550102",
  billingContactEmail: "pulse@example.com",
  liftRequired: "No",
  toolsRequired: "No",
  oneLineScopeSummary: "Production dispatch delivery verification only.",
  bridgeDetails: "No bridge required.",
  accessNotes: "No site access required.",
  closeoutRequirements: "Confirm API accepted and returned a delivery id."
};
const res = await fetch("https://www.alreadyherellc.com/api/dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
const json = await res.json();
console.log(res.status, JSON.stringify(json));
if (res.status !== 200 || !json.ok || typeof json.resendId !== "string") process.exit(1);
