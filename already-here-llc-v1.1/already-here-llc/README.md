# Already Here LLC website

Lean multi-page B2B field-service website for Already Here LLC, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS

## Pages

- Home
- Services
- Who We Serve
- Contact / Dispatch
- Privacy Policy
- Thank You

## Environment variables

Copy `.env.example` to `.env.local` and set the following values:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
FORMSPREE_ENDPOINT=https://formspree.io/f/your_form_id
```

`FORMSPREE_ENDPOINT` is required for production submissions. Without it, the form renders normally but submission will fail with a clear configuration error.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment notes

### Git-based Vercel deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add these environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SITE_URL`
   - `FORMSPREE_ENDPOINT`
4. Deploy.

### Vercel CLI deployment

```bash
npm i -g vercel
vercel --prod
```

## Production QA

- Confirm homepage loads on desktop and mobile.
- Confirm Phoenix-based and Commercially Insured are visible high on the page.
- Confirm Request Dispatch and Send Scope CTAs are visible quickly.
- Confirm the dispatch form submits successfully with a real endpoint.
- Confirm uploaded PDF/JPG/PNG files are accepted.
- Confirm proof image is present.
- Confirm no prohibited claims remain in public copy.

## Form processing

The contact form posts to `/api/dispatch`, which validates required fields and then forwards the multipart payload to the configured Formspree endpoint. File upload support on Formspree depends on the plan in use.
