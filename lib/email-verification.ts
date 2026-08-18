import { promises as dns } from 'dns';
import { createConnection } from 'net';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailVerificationResult {
  email: string;
  domain: string;
  reachable: boolean;
  mxRecords: string[];
  smtpResponse?: string;
  smtpCode?: number;
  reason: string;
  verifiedAt: string;
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

export async function verifyDomain(domain: string): Promise<{ ok: boolean; mxRecords: string[]; reason: string }> {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) {
      return { ok: true, mxRecords: mx.sort((a, b) => a.priority - b.priority).map((r) => r.exchange), reason: 'MX records found' };
    }
  } catch {
    // fall through to A record check
  }
  try {
    const a = await dns.resolve4(domain);
    if (a && a.length > 0) {
      return { ok: true, mxRecords: [domain], reason: 'A record fallback' };
    }
  } catch {
    // no A record
  }
  return { ok: false, mxRecords: [], reason: 'No MX or A records for domain' };
}

function smtpConversation(host: string, email: string, fromDomain: string): Promise<{ code?: number; response: string }> {
  return new Promise((resolve) => {
    const timeout = 8000;
    const client = createConnection(25, host);
    let buffer = '';
    let step = 0;
    // eslint-disable-next-line prefer-const
    let timer: NodeJS.Timeout;

    function cleanup() {
      try {
        client.write('QUIT\r\n');
      } catch { /* ignore */ }
      client.destroy();
      clearTimeout(timer);
    }

    function fail(reason: string) {
      cleanup();
      resolve({ response: reason });
    }

    function sendLine(line: string) {
      try {
        client.write(`${line}\r\n`);
      } catch {
        fail('write failed');
      }
    }

    function next(codeLine: string) {
      const codeMatch = codeLine.match(/^(\d{3})/);
      const code = codeMatch ? parseInt(codeMatch[1], 10) : 0;

      if (step === 0) {
        if (code >= 200 && code < 300) {
          step = 1;
          sendLine(`EHLO ${fromDomain}`);
        } else {
          fail(`greeting rejected: ${codeLine.trim()}`);
        }
      } else if (step === 1) {
        if (code >= 200 && code < 300) {
          step = 2;
          sendLine(`MAIL FROM: <noreply@${fromDomain}>`);
        } else {
          fail(`EHLO rejected: ${codeLine.trim()}`);
        }
      } else if (step === 2) {
        if (code >= 200 && code < 300) {
          step = 3;
          sendLine(`RCPT TO: <${email}>`);
        } else {
          fail(`MAIL FROM rejected: ${codeLine.trim()}`);
        }
      } else if (step === 3) {
        cleanup();
        resolve({ code, response: codeLine.trim() });
      }
    }

    timer = setTimeout(() => fail('SMTP timeout'), timeout);

    client.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line) continue;
        // SMTP multiline replies use code-line format; take final line of a reply
        const isLast = line[3] === ' ';
        if (isLast) {
          next(line);
        }
      }
    });

    client.on('error', () => fail('connection error'));
    client.on('timeout', () => fail('connection timeout'));
    client.on('close', () => {
      if (step < 3) fail('connection closed prematurely');
    });
  });
}

export async function verifyRecipient(email: string): Promise<EmailVerificationResult> {
  const verifiedAt = new Date().toISOString();
  email = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return { email, domain: '', reachable: false, mxRecords: [], reason: 'invalid email format', verifiedAt };
  }

  const domain = extractDomain(email);
  const domainCheck = await verifyDomain(domain);
  if (!domainCheck.ok) {
    return { email, domain, reachable: false, mxRecords: [], reason: domainCheck.reason, verifiedAt };
  }

  // Try SMTP RCPT verification against MX hosts; most public mail servers block this,
  // so a non-committal response is treated as "unknown" rather than invalid.
  for (const host of domainCheck.mxRecords) {
    const smtp = await smtpConversation(host, email, 'alreadyherellc.com');
    if (smtp.code) {
      if (smtp.code >= 250 && smtp.code < 260) {
        return { email, domain, reachable: true, mxRecords: domainCheck.mxRecords, smtpCode: smtp.code, smtpResponse: smtp.response, reason: 'SMTP RCPT accepted', verifiedAt };
      }
      if (smtp.code >= 550 && smtp.code < 560) {
        return { email, domain, reachable: false, mxRecords: domainCheck.mxRecords, smtpCode: smtp.code, smtpResponse: smtp.response, reason: 'SMTP user unknown', verifiedAt };
      }
    }
  }

  return { email, domain, reachable: false, mxRecords: domainCheck.mxRecords, reason: 'SMTP verification inconclusive; domain reachable', verifiedAt };
}
