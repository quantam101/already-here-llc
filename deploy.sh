#!/bin/bash
# Already Here LLC — v1.1 Production Deploy Script
# Run from the directory where you extracted already-here-llc-v1.1.zip
# Requires: git, GitHub access to quantam101/already-here-llc

set -e

REPO="https://github.com/quantam101/already-here-llc.git"
SRC="./already-here-llc"
BRANCH="feat/v1.1-sdvosb-blog-capability"

echo "▶ Cloning repo..."
git clone "$REPO" live-repo
cd live-repo

echo "▶ Creating feature branch..."
git checkout -b "$BRANCH"

echo "▶ Copying updated files..."
cp "$SRC/lib/site.ts"                          ./lib/site.ts
cp "$SRC/lib/blog.ts"                          ./lib/blog.ts
cp "$SRC/app/layout.tsx"                       ./app/layout.tsx
cp "$SRC/app/page.tsx"                         ./app/page.tsx
cp "$SRC/app/sitemap.ts"                       ./app/sitemap.ts
cp "$SRC/app/api/dispatch/route.ts"            ./app/api/dispatch/route.ts
cp "$SRC/components/Header.tsx"                ./components/Header.tsx
cp "$SRC/components/Footer.tsx"                ./components/Footer.tsx
cp "$SRC/components/ProofBlock.tsx"            ./components/ProofBlock.tsx
cp "$SRC/tailwind.config.ts"                   ./tailwind.config.ts
cp "$SRC/package.json"                         ./package.json
cp "$SRC/.env.example"                         ./.env.example

echo "▶ Creating new routes..."
mkdir -p app/dispatch app/capability-statement app/blog "app/blog/[slug]" content/blog
cp "$SRC/app/dispatch/page.tsx"                ./app/dispatch/page.tsx
cp "$SRC/app/capability-statement/page.tsx"    ./app/capability-statement/page.tsx
cp "$SRC/app/blog/page.tsx"                    ./app/blog/page.tsx
cp "$SRC/app/blog/[slug]/page.tsx"             "./app/blog/[slug]/page.tsx"
cp "$SRC/content/blog/"*.md                    ./content/blog/

echo "▶ Staging and committing..."
git add -A
git commit -m "feat: v1.1 — SDVOSB badge, real phone, NAP address, social proof, pricing signal, blog route, capability statement, LocalBusiness schema"

echo "▶ Pushing to GitHub..."
git push origin "$BRANCH"

echo ""
echo "✓ Branch pushed: $BRANCH"
echo ""
echo "NEXT STEPS:"
echo "  1. Open PR on GitHub and merge to main"
echo "     → Vercel auto-deploys production on merge"
echo ""
echo "  2. Add to Vercel dashboard → Settings → Environment Variables:"
echo "     RESEND_API_KEY        = re_xxxxxxxxxxxx"
echo "     DISPATCH_TO_EMAIL     = dispatch@alreadyherellc.com"
echo "     NEXT_PUBLIC_SITE_URL  = https://www.alreadyherellc.com"
echo ""
echo "  3. Verify live at: https://alreadyherellc.com"
echo "     Check: /capability-statement  /blog  /dispatch (pricing signal)"
echo "     Check: phone in header and footer"
echo "     Check: SDVOSB badge in header logo row"
