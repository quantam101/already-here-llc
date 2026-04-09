# Runbook

## Production domains

- Canonical: https://www.alreadyherellc.com
- Redirect: https://alreadyherellc.com -> https://www.alreadyherellc.com

## Current DNS baseline

- A @ 216.198.79.1
- CNAME www 39c0f568391ce377.vercel-dns-017.com.

## Deploy verification checklist

- homepage loads
- services page loads
- who-we-serve page loads
- dispatch page loads
- service-area page loads
- contact page loads
- privacy page loads
- thank-you page loads
- apex redirects to www
- no SSL warning
- dispatch path still works

## Rollback awareness

If a production deploy breaks:

1. identify last known-good Vercel deployment
2. roll back in Vercel
3. re-test core routes
4. document cause

## Dispatch failure procedure

1. verify /dispatch loads
2. verify submit path
3. verify /api/dispatch
4. verify environment variables
5. verify downstream email or intake behavior

## Domain or SSL failure procedure

1. check Vercel Domains for Valid Configuration
2. verify GoDaddy DNS matches Vercel requirements
3. verify apex redirect and www production assignment
4. test both domains in private mode
5. inspect for mixed content if needed