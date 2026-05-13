# ProfitEngine environment checklist

Use this before starting the Oracle-hosted runtime. Do not paste secret values into GitHub, issues, tickets, screenshots, or chat.

## Minimum required keys

The extracted v4 README identifies these as minimum live keys:

```text
GROQ_API_KEY
GITHUB_TOKEN
```

## Runtime basics

```text
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=http://129.153.101.0:3000
```

## Recommended publishing keys

Validate whichever publishers are enabled in the app configuration:

```text
DEVTO_API_KEY
HASHNODE_TOKEN
MEDIUM_TOKEN
GITHUB_TOKEN
```

## Alerting/email keys

```text
ALERT_EMAIL
GMAIL_APP_PASSWORD
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
```

## Revenue/affiliate/payment keys

Only configure live keys when the connected platform account is verified and you can reconcile transactions externally.

```text
STRIPE_SECRET_KEY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
AFFILIATE_NETWORK_KEYS
```

## Safety rules

- Never commit `.env`.
- Never expose private keys to client-side JavaScript.
- Fail fast if required runtime keys are missing.
- Treat dashboard counters as untrusted until provider/platform data confirms them.
- Rotate any key that was previously pasted into an untrusted place.

## Boot validation

After `.env` is configured:

```bash
cd ~/profitengine
npm ci --omit=dev || npm install --omit=dev
node -e "require('fs').accessSync('.env'); console.log('env file present')"
pm2 start ecosystem.config.cjs
pm2 save
```

## Public validation

```bash
curl -i http://129.153.101.0:3000/api/health
curl -i http://129.153.101.0:3000/api/status
curl -i http://129.153.101.0:3000/api/posts
curl -i http://129.153.101.0:3000/api/earnings
```
