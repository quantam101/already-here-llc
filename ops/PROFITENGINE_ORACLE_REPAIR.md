# ProfitEngine Oracle repair runbook

This runbook restores the ProfitEngine runtime after the public Vercel status page reports the host runtime as offline or degraded.

## Current architecture

- Public status surface: Vercel route `/profitengine` on the Already Here LLC site.
- Runtime host: Oracle VM expected to serve the ProfitEngine API on port `3000`.
- Expected runtime endpoints:
  - `/api/health`
  - `/api/status`
  - `/api/posts`
  - `/api/earnings`

The Vercel page does not fabricate posts, earnings, or automation state. It only reports endpoint reachability.

## Required runtime files

The ProfitEngine application root should contain at minimum:

```text
package.json
package-lock.json
index.js
.env
scheduler/
agents/
publishers/
config/
data/
logs/
```

## Required environment variables

The extracted v4 README indicates the minimum live keys are:

```text
GROQ_API_KEY
GITHUB_TOKEN
```

Additional publisher, email, affiliate, Stripe, PayPal, or platform credentials may be required before posting and revenue verification can work.

Do not treat the engine as profitable until platform-side balances or transactions confirm revenue.

## VM repair sequence

Run from the ProfitEngine root on the Oracle host:

```bash
cd ~/profitengine
unzip -o /path/to/profitengine_remaining_objectives_fix_v2.zip
chmod +x ops/*.sh ops/profitengine-control-plane.js

APP_DIR=$PWD PUBLIC_IP=129.153.101.0 ./ops/profitengine-preflight.sh
APP_DIR=$PWD PUBLIC_IP=129.153.101.0 ./ops/profitengine-live-repair.sh
APP_DIR=$PWD PUBLIC_IP=129.153.101.0 ./ops/profitengine-smoke-test.sh
```

Optional port 80 reverse proxy:

```bash
APP_DIR=$PWD ./ops/profitengine-install-nginx.sh
```

## PM2 fallback commands

If the repair scripts are unavailable, recover manually:

```bash
cd ~/profitengine
npm ci --omit=dev || npm install --omit=dev
pm2 start index.js --name profitengine --time --update-env
pm2 save
pm2 list
pm2 logs profitengine --lines 100
```

## Local verification

Run on the Oracle host:

```bash
curl -i http://127.0.0.1:3000/api/health
curl -i http://127.0.0.1:3000/api/status
curl -i http://127.0.0.1:3000/api/posts
curl -i http://127.0.0.1:3000/api/earnings
```

## Public verification

Run from outside the Oracle host:

```bash
curl -i http://129.153.101.0:3000/api/health
curl -i http://129.153.101.0:3000/api/status
curl -i http://129.153.101.0:3000/api/posts
curl -i http://129.153.101.0:3000/api/earnings
```

## OCI/network checks if local works but public fails

Confirm the following in Oracle Cloud:

```text
Compute instance state is RUNNING
Public IP is still assigned
VCN security list / NSG allows TCP 22, 80, 3000, 3001 from intended sources
Ubuntu firewall or iptables allows TCP 80, 3000, 3001
Process is listening on 0.0.0.0, not only 127.0.0.1, when public access is intended
```

## Acceptance criteria

Do not mark ProfitEngine live until all of these are true:

1. Vercel `/profitengine` page is reachable.
2. Oracle `/api/health` returns healthy externally.
3. Oracle `/api/posts` returns current successful publish data or platform-side published records confirm posts.
4. Oracle `/api/earnings` returns live platform-connected earnings data or Stripe/PayPal/platform dashboards confirm revenue.
5. Logs do not show recurring boot, key, publisher, or scheduler errors.

## Revenue integrity rule

Dashboard counters alone are not proof of revenue. Revenue requires live platform confirmation or provider transaction/balance data.
