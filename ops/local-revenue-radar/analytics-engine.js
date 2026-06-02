function groupCount(records, keySelector) {
  return records.reduce((totals, record) => {
    const key = keySelector(record) ?? 'unknown';
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
}

function average(values) {
  const numericValues = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (numericValues.length === 0) return 0;
  return Math.round(numericValues.reduce((total, value) => total + value, 0) / numericValues.length);
}

export function summarizePipeline(ingestedLeads) {
  const accepted = ingestedLeads.filter((entry) => entry.accepted !== false);
  const rejected = ingestedLeads.filter((entry) => entry.accepted === false);

  return {
    total: ingestedLeads.length,
    accepted: accepted.length,
    rejected: rejected.length,
    averageScore: average(accepted.map((entry) => entry.routing?.score)),
    estimatedPipelineRevenue: accepted.reduce((total, entry) => total + Number(entry.lead?.estimatedRevenue ?? 0), 0),
    byRoute: groupCount(accepted, (entry) => entry.routing?.route),
    byStatus: groupCount(accepted, (entry) => entry.routing?.status),
    byCategory: groupCount(accepted, (entry) => entry.lead?.categoryId),
    bySource: groupCount(accepted, (entry) => entry.lead?.sourceId),
    rejectionReasons: rejected.flatMap((entry) => entry.errors ?? [])
  };
}

export function readinessSnapshot(summary) {
  return {
    hasCallableLeads: (summary.byStatus.CALL ?? 0) > 0,
    hasReferralLeads: (summary.byStatus.REFER ?? 0) > 0,
    needsComplianceReview: summary.rejectionReasons.length > 0 || (summary.byRoute.SELL_IT ?? 0) > 0,
    deploymentReady: summary.rejected === 0,
    summary
  };
}
