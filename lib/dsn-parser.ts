export type BounceType = 'hard' | 'soft' | 'unknown';
export interface ParsedDSN {
  statusCode: string;
  statusClass: '2' | '4' | '5' | '?';
  bounceType: BounceType;
  action?: string;
  diagnostic?: string;
  recipient?: string;
  remoteMta?: string;
}

const STATUS_LINE_RE = /^(\d+\.\d+\.\d+)\s+(.+)$/;
const RECIPIENT_RE = /Final-Recipient:\s*rfc822;?\s*([^\s;]+)/i;
const EMAIL_IN_BODY_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const ACTION_RE = /Action:\s*(\w+)/i;
const REMOTE_MTA_RE = /Remote-MTA:\s*(?:dns;?)?\s*([^\s;]+)/i;

export function parseDSN(raw: string): ParsedDSN {
  const text = (raw || '').replace(/\r\n/g, '\n');

  // Look for the DSN status line, e.g. "5.1.1 User unknown"
  let statusCode = '';
  let diagnostic = '';
  for (const line of text.split('\n')) {
    const match = line.match(STATUS_LINE_RE);
    if (match) {
      statusCode = match[1];
      diagnostic = match[2].trim();
      break;
    }
  }

  // Fallback: hunt for common SMTP status codes in the body
  if (!statusCode) {
    const fallback = text.match(/\b([45]\.\d+\.\d+)\b/);
    if (fallback) {
      statusCode = fallback[1];
    }
  }

  if (!diagnostic) {
    const m = text.match(/(?:550|551|552|553|554|450|451|452|421)\s+(.+)/i);
    if (m) diagnostic = m[1].trim();
  }

  let recipient = text.match(RECIPIENT_RE)?.[1].toLowerCase();
  if (!recipient) {
    const emailMatch = text.match(EMAIL_IN_BODY_RE);
    if (emailMatch) recipient = emailMatch[0].toLowerCase();
  }
  const actionMatch = text.match(ACTION_RE);
  const remoteMtaMatch = text.match(REMOTE_MTA_RE);

  // Try to capture a more detailed diagnostic code line
  if (!diagnostic) {
    const diagMatch = text.match(/Diagnostic-Code:\s*(.+)/i);
    if (diagMatch) diagnostic = diagMatch[1].trim();
  }

  const statusClass = statusCode ? (statusCode[0] as '2' | '4' | '5' | '?') : '?';
  let bounceType: BounceType = 'unknown';
  if (statusClass === '5') bounceType = 'hard';
  else if (statusClass === '4') bounceType = 'soft';
  else if (text.toLowerCase().includes('address not found') || text.toLowerCase().includes('user unknown')) {
    bounceType = 'hard';
  }

  return {
    statusCode,
    statusClass,
    bounceType,
    action: actionMatch?.[1],
    diagnostic,
    recipient,
    remoteMta: remoteMtaMatch?.[1],
  };
}

export function isHardBounce(parsed: ParsedDSN): boolean {
  if (parsed.bounceType === 'hard') return true;
  if (!parsed.statusCode) return false;
  const sub = parsed.statusCode; // x.y.z
  const knownHard: string[] = [
    '5.1.1', '5.1.2', '5.1.3', '5.1.6',
    '5.2.1', '5.2.2', '5.2.3',
    '5.3.1', '5.3.2',
    '5.4.1', '5.4.4', '5.4.6',
    '5.7.1', '5.7.13',
  ];
  return knownHard.includes(sub);
}
