import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getEnterpriseStore } from '@/lib/enterprise-store';
import { buildPacketExport } from '@/lib/enterprise-export';

const requestSchema = z.object({
  itemId: z.string().min(1),
  packetType: z.enum(['capability', 'grant', 'closeout']).default('capability'),
  format: z.enum(['zip', 'docx', 'pdf']).default('zip'),
});

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY || !provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parseResult = requestSchema.safeParse({
    itemId: url.searchParams.get('itemId') || undefined,
    packetType: url.searchParams.get('packetType') || 'capability',
    format: url.searchParams.get('format') || 'zip',
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const store = getEnterpriseStore();
  const item = store.getQueue().find((entry) => entry.itemId === parseResult.data.itemId);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const exportData = await buildPacketExport(item, parseResult.data.packetType);
  const { format } = parseResult.data;
  const buffer = format === 'docx' ? exportData.docx : format === 'pdf' ? exportData.pdf : exportData.zip;
  const filename = `${parseResult.data.packetType}-${item.itemId}.${format}`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
