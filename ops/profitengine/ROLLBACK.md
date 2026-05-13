# ProfitEngine rollback and recovery notes

Use this only on the runtime host after a failed deploy or bad restart.

## Fast status check

```bash
pm2 list
pm2 describe profitengine
pm2 logs profitengine --lines 100
```

## Restart current process

```bash
pm2 restart profitengine --update-env
pm2 save
```

## Stop a broken process

```bash
pm2 stop profitengine
pm2 save
```

## Start from the app root

```bash
cd ~/profitengine
pm2 start index.js --name profitengine --time --update-env
pm2 save
```

## Verify local runtime

```bash
curl -i http://127.0.0.1:3000/api/health
curl -i http://127.0.0.1:3000/api/status
curl -i http://127.0.0.1:3000/api/posts
curl -i http://127.0.0.1:3000/api/earnings
```

## Keep revenue proof strict

Do not mark revenue verified from dashboard counters alone. Revenue must match provider or platform transaction/balance data.
