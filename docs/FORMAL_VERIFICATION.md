# Formal Verification Specification

## State Machine Immutability Proof

### Definition

The GMAOS Sovereign Core operates as a deterministic finite state machine (DFSM) where:

```
M = (Q, Σ, δ, q₀, F)
```

- **Q** = {RECEIVED, CACHE_HIT, ROUTING, COST_CHECK, APPROVAL_CHECK, EXECUTING, VERIFYING, COMMITTED, BLOCKED}
- **Σ** = {execute, cache_match, cache_miss, cost_ok, cost_blocked, approval_ok, approval_required, verify_ok, verify_fail, commit_ok}
- **δ** = transition function (defined below)
- **q₀** = RECEIVED
- **F** = {CACHE_HIT, COMMITTED, BLOCKED}

### Transition Function δ

```
δ(RECEIVED,      execute)           → CACHE_HIT      if cache_match
δ(RECEIVED,      execute)           → ROUTING         if cache_miss
δ(ROUTING,       cost_ok)           → COST_CHECK
δ(ROUTING,       cost_blocked)      → BLOCKED
δ(COST_CHECK,    approval_ok)       → EXECUTING
δ(COST_CHECK,    approval_required) → BLOCKED
δ(EXECUTING,     verify_ok)         → VERIFYING
δ(EXECUTING,     verify_fail)       → BLOCKED
δ(VERIFYING,     commit_ok)         → COMMITTED
```

### Immutability Invariant

**Theorem 1 (State Immutability):** For all states q ∈ Q and inputs σ ∈ Σ, the transition δ(q, σ) produces a new state q' without mutating q.

**Proof:** By construction.

All state representations use Python `@dataclass(frozen=True)` and TypeScript `Readonly<T>` types:

1. `ExecutionResult` — frozen dataclass: fields are set at construction, `__setattr__` raises `FrozenInstanceError`
2. `ExecutionContext` — frozen dataclass: all request parameters immutable after construction
3. `CacheHit` — frozen dataclass
4. `RouteDecision` — frozen dataclass
5. `ComplexityResult` — frozen dataclass
6. `VerificationResult` — frozen dataclass
7. `AuditEvent` — frozen dataclass with `default_factory` for timestamp (per-instance, not class-level)
8. `ScanFinding` — frozen dataclass with tuple (immutable) markers

Each transition function returns a **new** `ExecutionResult` rather than modifying an existing one. The `_run_pipeline` method in `SovereignAutomationCore` is a pure pipeline that threads immutable context through each stage. No stage mutates the `ExecutionContext` or any intermediate result.

**∎ QED**: The state machine is provably immutable — no transition mutates prior state.

### Formal Safety Properties

**Property 1 (No-Spend Guarantee):** In `strict_zero_spend` mode, ∀ routes r: r.estimated_cost_usd = 0 ∧ r.paid = false.

**Proof:** `CostGuard.assert_allowed()` raises `CostGuardError` (halting execution) if `r.paid = true ∨ r.estimated_cost_usd > 0` when `mode = "strict_zero_spend"`. The state machine transitions to BLOCKED, and no execution occurs. ∎

**Property 2 (Secret-Leak Prevention):** ∀ outputs o: `Verifier.verify_text_output(o)` rejects o if o contains any marker ∈ BLOCKED_MARKERS.

**Proof:** The verifier scans the lowercased output against all blocked markers. If any marker is found, `VerificationResult(passed=False)` is returned, and the pipeline transitions to BLOCKED without committing. ∎

**Property 3 (Idempotent Cache Commits):** For identical (record_id, vector, output), `VectorCache.commit()` uses `INSERT OR REPLACE`, making repeated calls idempotent. The SQLite constraint on `id TEXT PRIMARY KEY` guarantees at-most-one record per ID. ∎

---

## Big-O Runtime Complexity Bounds

### TypeScript Pipeline Engine (`lib/pipeline.ts`)

| Function | Time Complexity | Space Complexity |
|---|---|---|
| `pipe(initial, ...stages)` | O(n) where n = stages | O(1) auxiliary |
| `compose(f, g)` | O(1) | O(1) |
| `lift(transform)` | O(1) per call | O(1) |
| `guard(predicate, msg)` | O(1) per call | O(1) |
| `chain(initial, ...stages)` | O(n) where n = stages | O(1) auxiliary |
| `mapImmutable(items, fn)` | O(n) where n = items | O(n) output |
| `filterImmutable(items, fn)` | O(n) where n = items | O(n) worst case |
| `partition(items, fn)` | O(n) single pass | O(n) two arrays |
| `fold(items, init, fn)` | O(n) where n = items | O(1) auxiliary |

### Python Pipeline Engine (`runtime/pipeline.py`)

| Function | Time Complexity | Space Complexity |
|---|---|---|
| `pipe(initial, *stages)` | O(n) where n = stages | O(1) auxiliary |
| `compose(f, g)` | O(1) | O(1) |
| `lift(transform)` | O(1) per call | O(1) |
| `guard(predicate, msg)` | O(1) per call | O(1) |
| `chain(initial, *stages)` | O(n) where n = stages | O(1) auxiliary |
| `map_immutable(items, fn)` | O(n) | O(n) output |
| `filter_immutable(items, fn)` | O(n) | O(n) worst case |
| `partition(items, fn)` | O(n) single pass | O(n) two lists |
| `fold(items, init, fn)` | O(n) | O(1) auxiliary |

### Sovereign Core Execution Pipeline

| Stage | Time Complexity | Notes |
|---|---|---|
| Manifest minification | O(m) where m = input chars | Regex single pass |
| Vector cache search | O(k × d) where k = cached records, d = embedding dim | Cosine similarity over all records |
| Complexity scoring | O(w + t) where w = words, t = risk terms | Single pass word scan + term match |
| Route decision | O(1) | Threshold comparison |
| Cost guard check | O(1) | Constant-time policy check |
| Output verification | O(v × b) where v = output length, b = blocked markers | Substring search per marker |
| Memory commit | O(d) for vector serialization | SQLite INSERT is O(log n) amortized |

**Total execution pipeline:** O(m + k×d + w + v×b) — linear in input size, linear scan of cache.

### Telemetry Layer

| Operation | Time Complexity | Space Complexity |
|---|---|---|
| `createRootSpan` / `createChildSpan` | O(1) | O(1) per span |
| `buildEvent` | O(a) where a = attributes count | O(1) per event |
| `serializeEvent` | O(e) where e = event size | O(e) JSON string |
| `TelemetryCollector.emit` | O(1) amortized append | O(1) per event |
| `TelemetryCollector.drain` | O(n) where n = events | O(n) copy |
| `TelemetryCollector.toNDJSON` | O(n × e) | O(n × e) output |

### Security Scanner

| Function | Time Complexity | Space Complexity |
|---|---|---|
| `scan_text(text)` | O(t × m) where t = text length, m = markers | O(m) results |
| `scan_repo(root)` | O(f × t × m) where f = files | O(f) findings |

All bounds are worst-case unless noted as amortized.

---

## Dispatch Validation Schema

The Zod schema (`lib/dispatch-schema.ts`) provides compile-time type inference:

**Invariant:** `DispatchPayload` type is derived from `DispatchSchema` via `z.infer<typeof DispatchSchema>`. Any schema change automatically propagates to the TypeScript type system — no manual type synchronization required.

**Validation complexity:** O(f) where f = number of fields. Each field validation is O(n) where n = field length (regex match, trim, length check). Total: O(f × n_max).

**Zero-trust property:** All inputs are validated before any business logic executes. The `parseDispatchInput` function returns a discriminated union — callers must handle the failure case to access the success value.
