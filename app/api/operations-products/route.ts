import { NextResponse } from 'next/server';
import catalog from '@/data/phase-2-product-catalog.json';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      version: catalog.version,
      products: catalog.products.map((product) => ({
        id: product.id,
        name: product.name,
        priority: product.priority,
        target_buyer: product.target_buyer,
        problem: product.problem,
        deliverables: product.deliverables,
        pricing: product.pricing
      }))
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    }
  );
}
