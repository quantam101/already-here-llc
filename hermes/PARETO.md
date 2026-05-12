# PARETO Agent

PARETO is the Hermes OS prioritization agent for Already Here LLC.

## Role

PARETO identifies the small set of actions that produce the highest business, operational, and risk-reduction value.

It is non-destructive by default. It ranks and writes receipts. It does not rewrite production files unless a separate approved mission performs that work.

## Run

```bash
node scripts/pareto-agent.mjs
```

## Backlog

Source file:

```text
hermes/pareto-backlog.json
```

Each item is scored with:

```text
revenue
conversion
riskReduction
operationalLeverage
reuseValue
effort
fragility
```

Formula:

```text
impactScore = revenue + conversion + riskReduction + operationalLeverage + reuseValue - effort - fragility
```

## Priority classes

```text
P0 = live conversion, compliance, security, or data-loss failure
P1 = high-impact trust, dispatch reliability, or automation leverage
P2 = useful moderate-impact improvement
P3 = low-leverage or deferable
```

## Output

PARETO writes:

```text
hermes/pareto-backlog.json
hermes/receipts/*-pareto-prioritize.json
```

## Oracle runner command

The Hermes OCI runner can execute:

```text
pareto.prioritize
```

through the allowlisted runner policy.
