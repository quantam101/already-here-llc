const CRM_FIELDS = [
  'id',
  'title',
  'categoryId',
  'sourceId',
  'serviceArea',
  'estimatedRevenue',
  'score',
  'route',
  'status',
  'nextAction',
  'evidenceUrl',
  'createdAt'
];

function escapeCsv(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCrmRecord(ingestedLead) {
  const lead = ingestedLead.lead ?? ingestedLead;
  const routing = ingestedLead.routing ?? ingestedLead.routingDecision ?? {};

  return {
    id: lead.id,
    title: lead.title,
    categoryId: lead.categoryId,
    sourceId: lead.sourceId,
    serviceArea: lead.serviceArea,
    estimatedRevenue: lead.estimatedRevenue,
    score: routing.score,
    route: routing.route,
    status: routing.status,
    nextAction: routing.nextAction,
    evidenceUrl: lead.evidenceUrl,
    createdAt: lead.createdAt
  };
}

export function exportCrmJson(ingestedLeads) {
  return ingestedLeads.filter((lead) => lead.accepted !== false).map(toCrmRecord);
}

export function exportCrmCsv(ingestedLeads) {
  const records = exportCrmJson(ingestedLeads);
  const header = CRM_FIELDS.join(',');
  const rows = records.map((record) => CRM_FIELDS.map((field) => escapeCsv(record[field])).join(','));
  return [header, ...rows].join('\n');
}

export { CRM_FIELDS };
