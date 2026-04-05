import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const endpoint = process.env.FORMSPREE_ENDPOINT;

  if (!endpoint) {
    return NextResponse.json(
      { message: 'Dispatch endpoint is not configured. Add FORMSPREE_ENDPOINT to continue.' },
      { status: 500 }
    );
  }

  const formData = await request.formData();

  const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'message'];

  for (const field of requiredFields) {
    const value = formData.get(field);

    if (typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json(
        { message: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  const email = formData.get('email');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { message: 'Use a valid business email address.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData,
      cache: 'no-store'
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { errors?: Array<{ message?: string }> }
        | null;

      const message =
        payload?.errors?.[0]?.message || 'Dispatch endpoint rejected the submission.';

      return NextResponse.json({ message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: 'Dispatch submission failed upstream.' },
      { status: 502 }
    );
  }
}