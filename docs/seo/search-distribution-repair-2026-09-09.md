# Search + Distribution Repair — 2026-09-09

## Objective

Remove the Google Search Console redirect/canonical failure from the `/content` proxy and make the production site emit one canonical robots/sitemap configuration.

## Code changes

- Preserve Jekyll trailing-slash canonical URLs through Next.js with `skipTrailingSlashRedirect: true`.
- Normalize proxied content routes to the trailing-slash GitHub Pages destination while leaving asset URLs intact.
- Use `https://www.alreadyherellc.com` as the generated canonical fallback.
- Generate robots rules from `app/robots.ts` only.
- Advertise both the application sitemap and content sitemap.
- Remove the duplicate static `public/robots.txt` source.

## Search Console status

The `alreadyherellc.com` property is already registered in Google Search Console. The latest account alert reports `Redirect error`, so ownership verification is not the current blocker.

After production deployment, the account-side actions are:

1. Validate the redirect fix in Search Console.
2. Re-submit `https://www.alreadyherellc.com/sitemap.xml`.
3. Re-submit `https://www.alreadyherellc.com/content/sitemap.xml`.
4. Request indexing for high-value canonical pages after live verification.

## GA4 status

The content repository already contains a production-safe GA4 `gtag.js` implementation that activates only when a real `G-...` measurement ID is configured. No verified measurement ID was found in the connected business mailbox or repositories, so no placeholder or fabricated ID is being deployed.

## Distribution credential status

Already configured in the publishing workflow: Dev.to, Hashnode, X/Twitter, Telegram, Facebook, Instagram, YouTube.

Account authorization still required for: Medium API key, LinkedIn token/person URN, Reddit OAuth credentials, TikTok access token, and the actual GA4 property/measurement ID.

The publisher and EAOS social engine already contain those distribution paths. Missing provider authorization—not article-generation code—is the remaining blocker for those channels.
