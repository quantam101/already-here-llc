# Sovereign VHLL Execution Fabric

Runtime sequence:

1. Receive objective.
2. Convert objective into VHLL manifest.
3. Validate manifest schema.
4. Run no-spend policy.
5. Minify system/context payload.
6. Check vector cache for known verified execution.
7. Return cache hit when confidence passes floor.
8. Compute complexity on cache miss.
9. Route simple deterministic tasks to scripts.
10. Route local AI tasks to local model when enabled.
11. Queue high-risk or paid tasks for approval.
12. Verify output.
13. Run security scan.
14. Log result.
15. Commit verified result to memory.
16. Update Lifelong Catch and Correct.

## Multi-Agent Swarm Engine

`runtime/swarm_engine.py` adds a fault-tolerant, parallel execution layer that
compiles declarative analytical intent into hardened, sandboxed plans.

Components:

- **`DeclarativeExecutionPlan` / `MetricAssertion`** — stdlib-dataclass schemas
  (no pydantic) that separate business intent from execution logic.
- **`SecurityEnforcer`** — strips code fences, rejects prohibited signatures
  (`import os/sys`, `subprocess`, `eval`/`exec`, `open`, `socket`, `getattr`, …)
  and injects declarative invariant assertions.
- **`FailoverInferenceGateway`** — local-first. Cloud inference (Gemini) is only
  attempted when `CostGuard` allows a paid route (`GMAOS_MODE != strict_zero_spend`
  and `GMAOS_PAID_ADAPTERS_ENABLED=true`) and the optional `google-genai` SDK is
  present; otherwise it serves a deterministic local plan. Cloud failures
  (quota, blackout, empty payload) fail over to local without dropping state.
- **`DistributedExecutionMatrix`** — runs the cloud E2B sandbox when online, else
  an isolated local subprocess in a unique temp dir (so parallel workers never
  collide) using `sys.executable` with a bounded timeout.
- **`AutonomousSwarmOrchestrator`** — fans out a batch of sub-queries across
  worker nodes via `asyncio.gather`, wired into the shared telemetry + audit log.

Smoke test:

```bash
python -m runtime.swarm_engine
```

Both cloud (`google-genai`) and sandbox (`e2b-code-interpreter`) packages are
optional; their absence simply forces the local execution paths.
