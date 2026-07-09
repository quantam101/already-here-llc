#!/usr/bin/env node

/**
 * Already Here LLC revenue pipeline exporter.
 *
 * Reads JSON records from a pipeline file and exports normalized CSV plus
 * a daily command summary. This script is local/CI safe and performs no
 * outbound sending, account creation, bid submission, or money movement.
 *
 * Usage:
 *   node scripts/revenue-pipeline-export.mjs --input data/revenue-pipeline.json --out exports
 *   node scripts/revenue-pipeline-export.mjs --input data/revenue-pipeline.json --format json
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'data/revenue-pipeline.json';
const DEFAULT_OUT_DIR = 'exports';

const REQUIRED_FIELDS = [
  'id',
  'source',
  'lane',
  'product_or_offer_name',
  'company_or_platform',
  'affiliate_or_sales_path',
  'target_buyer',
  'pain_solved',
  'estimated_commission_or_price',
  'cost_required',
  'profit_potential',
  'time_to_revenue',
  'content_angle',
  'marketing_channel',
  'stacking_fit',
  'risk_flags',
  'recommended_action',
  'status',
  'next_follow_up_date',
  'notes',
  'approval_required'
];

const CSV_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'source',
  'lane',
  'product_or_offer_name',
  'company_or_platform',
  'affiliate_or_sales_path',
  'target_buyer',
  'pain_solved',
  'estimated_commission_or_price',
  'cost_required',
  'profit_potential',
  'time_to_revenue',
  'content_angle',
  'marketing_channel',
  'stacking_fit',
  'risk_flags',
  'recommended_action',
  'status',
  'next_follow_up_date',
  'approval_required',
  'estimated_value',
  'probability',
  'score_total',
  'contact_name',
  'target_role',
  'email',
  'phone',
  'website',
  'outreach_subject',
  'outreach_channel',
  'outreach_approval_status',
  'tags',
  'notes'
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    out: DEFAULT_OUT_DIR,
    format: 'csv'
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--input' && next) {
      args.input = next;
      index += 1;
    } else if (token === '--out' && next) {
      args.out = next;
      index += 1;
    } else if (token === '--format' && next) {
      args.format = next;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Revenue Pipeline Exporter\n\nOptions:\n  --input <path>   JSON file containing an array of pipeline records. Default: ${DEFAULT_INPUT}\n  --out <dir>      Export directory. Default: ${DEFAULT_OUT_DIR}\n  --format <type>  csv or json. Default: csv\n`);
}

function normalizeRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  throw new Error('Input must be a JSON array or an object with a records array.');
}

function validateRecord(record, index) {
  const missing = REQUIRED_FIELDS.filter((field) => !(field in record));
  if (missing.length > 0) {
    throw new Error(`Record ${index} is missing required field(s): ${missing.join(', ')}`);
  }

  if (record.approval_required !== true && record.approval_required !== false) {
    throw new Error(`Record ${index} approval_required must be boolean.`);
  }

  return true;
}

function serializeValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(value) {
  const text = serializeValue(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function flattenRecord(record) {
  return {
    ...record,
    marketing_channel: record.marketing_channel,
    risk_flags: record.risk_flags,
    score_total: record.score?.total ?? '',
    contact_name: record.contact?.contact_name ?? '',
    target_role: record.contact?.target_role ?? '',
    email: record.contact?.email ?? '',
    phone: record.contact?.phone ?? '',
    website: record.contact?.website ?? '',
    outreach_subject: record.outreach?.subject ?? '',
    outreach_channel: record.outreach?.channel ?? '',
    outreach_approval_status: record.outreach?.approval_status ?? '',
    tags: record.tags ?? []
  };
}

function toCsv(records) {
  const header = CSV_COLUMNS.join(',');
  const rows = records.map((record) => {
    const flat = flattenRecord(record);
    return CSV_COLUMNS.map((column) => csvEscape(flat[column])).join(',');
  });
  return [header, ...rows].join('\n');
}

function priorityRank(record) {
  const score = record.score?.total ?? 0;
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function summarize(records) {
  const byStatus = new Map();
  const byLane = new Map();
  const approvalQueue = [];
  const hot = [];

  for (const record of records) {
    byStatus.set(record.status, (byStatus.get(record.status) ?? 0) + 1);
    byLane.set(record.lane, (byLane.get(record.lane) ?? 0) + 1);

    if (record.approval_required || record.status === 'approval_required') {
      approvalQueue.push(record);
    }

    if (priorityRank(record) === 'A' || Number(record.estimated_value ?? 0) >= 500) {
      hot.push(record);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    total_records: records.length,
    status_counts: Object.fromEntries([...byStatus.entries()].sort()),
    lane_counts: Object.fromEntries([...byLane.entries()].sort()),
    approval_queue_count: approvalQueue.length,
    hot_count: hot.length,
    approval_queue: approvalQueue.map((record) => ({
      id: record.id,
      company_or_platform: record.company_or_platform,
      lane: record.lane,
      status: record.status,
      recommended_action: record.recommended_action,
      next_follow_up_date: record.next_follow_up_date
    })),
    hot_records: hot.map((record) => ({
      id: record.id,
      priority: priorityRank(record),
      company_or_platform: record.company_or_platform,
      lane: record.lane,
      estimated_value: record.estimated_value ?? 0,
      score_total: record.score?.total ?? null,
      recommended_action: record.recommended_action
    }))
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  if (!existsSync(args.input)) {
    throw new Error(`Input file not found: ${args.input}`);
  }

  const raw = await readFile(args.input, 'utf8');
  const payload = JSON.parse(raw);
  const records = normalizeRecords(payload);

  records.forEach(validateRecord);

  await mkdir(args.out, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const summary = summarize(records);
  const summaryPath = path.join(args.out, `revenue-pipeline-summary-${date}.json`);
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  if (args.format === 'json') {
    const jsonPath = path.join(args.out, `revenue-pipeline-export-${date}.json`);
    await writeFile(jsonPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${jsonPath}`);
  } else if (args.format === 'csv') {
    const csvPath = path.join(args.out, `revenue-pipeline-export-${date}.csv`);
    await writeFile(csvPath, `${toCsv(records)}\n`, 'utf8');
    console.log(`Wrote ${csvPath}`);
  } else {
    throw new Error(`Unsupported format: ${args.format}. Use csv or json.`);
  }

  console.log(`Wrote ${summaryPath}`);
  console.log(`Records: ${records.length}; approvals: ${summary.approval_queue_count}; hot: ${summary.hot_count}`);
}

main().catch((error) => {
  console.error(`revenue-pipeline-export failed: ${error.message}`);
  process.exitCode = 1;
});
