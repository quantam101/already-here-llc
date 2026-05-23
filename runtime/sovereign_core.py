from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from .approval_gate import ApprovalGate, ApprovalRequired
from .audit_log import AuditLog
from .complexity_scorer import ComplexityScorer
from .cost_guard import CostGuard, CostGuardError
from .local_model_router import LocalModelRouter
from .memory_commit import MemoryCommit
from .minifier import ManifestMinifier
from .telemetry import TelemetryCollector, Severity
from .vector_cache import VectorCache
from .verifier import Verifier


@dataclass(frozen=True)
class ExecutionResult:
    status: str
    route_tier: str
    output: str
    cached: bool
    details: Dict[str, Any]


@dataclass(frozen=True)
class ExecutionContext:
    """Immutable execution request. All fields are frozen at construction."""

    system_declaration: str
    dynamic_context: str
    objective: str
    embedding_vector: List[float]
    namespace: str = "default"
    actor: str = "sovereign-core"

    @property
    def correlation_id(self) -> str:
        return hashlib.sha256(
            f"{self.objective}|{self.namespace}".encode("utf-8")
        ).hexdigest()[:16]


class SovereignAutomationCore:
    """
    Local-first, no-spend EAOS execution primitive.

    This is not a paid API wrapper. It is a guarded execution router that:
    - compresses VHLL/declarative intent,
    - checks local verified memory first,
    - scores complexity,
    - routes simple work locally,
    - queues high-risk work for approval,
    - blocks paid/cloud escalation by default,
    - logs everything with structured telemetry.
    """

    def __init__(self) -> None:
        self.telemetry = TelemetryCollector("sovereign-core")
        self.audit = AuditLog(telemetry=self.telemetry)
        self.cost_guard = CostGuard()
        self.approval_gate = ApprovalGate()
        self.minifier = ManifestMinifier()
        self.cache = VectorCache()
        self.scorer = ComplexityScorer()
        self.router = LocalModelRouter()
        self.verifier = Verifier()
        self.memory = MemoryCommit(self.cache, self.verifier)

    def execute(
        self,
        system_declaration: str,
        dynamic_context: str,
        objective: str,
        embedding_vector: List[float],
        namespace: str = "default",
        actor: str = "sovereign-core",
    ) -> ExecutionResult:
        ctx = ExecutionContext(
            system_declaration=system_declaration,
            dynamic_context=dynamic_context,
            objective=objective,
            embedding_vector=embedding_vector,
            namespace=namespace,
            actor=actor,
        )
        root_span = self.telemetry.span("execute")
        self.telemetry.info(root_span, "execution_received", {"namespace": ctx.namespace, "objective_len": len(ctx.objective)})

        return self._run_pipeline(ctx, root_span)

    def _run_pipeline(self, ctx: ExecutionContext, root_span: Any) -> ExecutionResult:
        self.audit.info(ctx.actor, "execution_received", {"namespace": ctx.namespace, "objective": ctx.objective[:250]}, ctx.correlation_id)

        minify_span = self.telemetry.span("minify", root_span)
        clean_system, clean_context = self.minifier.minify(ctx.system_declaration, ctx.dynamic_context)
        self.telemetry.info(minify_span, "manifest_minified", {"system_chars": len(clean_system), "context_chars": len(clean_context)})
        self.audit.info(ctx.actor, "manifest_minified", {"system_chars": len(clean_system), "context_chars": len(clean_context)}, ctx.correlation_id)

        cache_span = self.telemetry.span("cache_lookup", root_span)
        cache_hit = self.cache.search(ctx.embedding_vector, namespace=ctx.namespace)
        if cache_hit:
            self.telemetry.info(cache_span, "vector_cache_hit", {"record_id": cache_hit.record_id, "confidence": cache_hit.confidence})
            self.audit.info(ctx.actor, "vector_cache_hit", {"record_id": cache_hit.record_id, "confidence": cache_hit.confidence}, ctx.correlation_id)
            return ExecutionResult(
                status="ok",
                route_tier="VERIFIED_VECTOR_CACHE",
                output=cache_hit.output,
                cached=True,
                details={"confidence": cache_hit.confidence, "record_id": cache_hit.record_id},
            )

        route_span = self.telemetry.span("route", root_span)
        complexity = self.scorer.score(objective=ctx.objective, context=clean_context)
        route = self.router.route(complexity.score)
        self.telemetry.info(route_span, "route_selected", {"tier": route.decision.tier, "complexity": complexity.score})

        try:
            self.cost_guard.assert_allowed(route.decision)
        except CostGuardError as exc:
            self.telemetry.error(route_span, "cost_guard_block", {"error": str(exc)})
            self.audit.blocked(ctx.actor, "cost_guard_block", {"error": str(exc), "route": asdict(route.decision)}, ctx.correlation_id)
            raise

        self.audit.info(ctx.actor, "route_selected", {"route": asdict(route.decision), "reason": route.reason, "complexity": asdict(complexity)}, ctx.correlation_id)

        if route.decision.tier == "HUMAN_REVIEW_QUEUE":
            try:
                self.approval_gate.require(
                    action="complex_or_external_execution",
                    reason=route.reason,
                    payload={
                        "objective": ctx.objective,
                        "complexity": asdict(complexity),
                        "route": asdict(route.decision),
                    },
                )
            except ApprovalRequired as exc:
                self.telemetry.warn(route_span, "approval_required", {"message": str(exc)})
                self.audit.blocked(ctx.actor, "approval_required", {"message": str(exc)}, ctx.correlation_id)
                return ExecutionResult(
                    status="approval_required",
                    route_tier="HUMAN_REVIEW_QUEUE",
                    output=str(exc),
                    cached=False,
                    details={"complexity": asdict(complexity), "reason": route.reason},
                )

        exec_span = self.telemetry.span("local_execute", root_span)
        if route.decision.tier == "DETERMINISTIC_LOCAL":
            output = self._deterministic_execute(clean_system, clean_context, ctx.objective)
        elif route.decision.tier == "LOCAL_MODEL":
            output = self._local_model_placeholder(clean_system, clean_context, ctx.objective)
        else:
            output = "Execution queued. No unsafe route executed."
        self.telemetry.info(exec_span, "execution_complete", {"tier": route.decision.tier, "output_len": len(output)})

        verify_span = self.telemetry.span("verify", root_span)
        verified = self.verifier.verify_text_output(output)
        if not verified.passed:
            self.telemetry.error(verify_span, "verification_failed", {"reason": verified.reason})
            self.audit.blocked(ctx.actor, "verification_failed", {"reason": verified.reason}, ctx.correlation_id)
            return ExecutionResult("blocked", route.decision.tier, verified.reason, False, {"verification": asdict(verified)})

        commit_span = self.telemetry.span("commit", root_span)
        record_id = self.memory.commit_verified(ctx.embedding_vector, output, namespace=ctx.namespace)
        self.telemetry.info(commit_span, "execution_committed", {"record_id": record_id, "route_tier": route.decision.tier})
        self.audit.info(ctx.actor, "execution_committed", {"record_id": record_id, "route_tier": route.decision.tier}, ctx.correlation_id)
        return ExecutionResult(
            status="ok",
            route_tier=route.decision.tier,
            output=output,
            cached=False,
            details={"record_id": record_id, "complexity": asdict(complexity)},
        )

    def _deterministic_execute(self, clean_system: str, clean_context: str, objective: str) -> str:
        return (
            "DETERMINISTIC_LOCAL_RESULT\n"
            f"Objective: {objective}\n"
            f"System chars: {len(clean_system)}\n"
            f"Context chars: {len(clean_context)}\n"
            "Status: draft_created_no_external_execution"
        )

    def _local_model_placeholder(self, clean_system: str, clean_context: str, objective: str) -> str:
        return (
            "LOCAL_MODEL_ROUTE_SELECTED\n"
            f"Objective: {objective}\n"
            "Status: local_model_adapter_required"
        )


if __name__ == "__main__":
    dim = int(os.getenv("GMAOS_EMBEDDING_DIM", "384"))
    core = SovereignAutomationCore()
    result = core.execute(
        system_declaration="""You are a no-spend local execution fabric.""",
        dynamic_context="""Create a safe draft and do not call paid services.""",
        objective="Create a local-only project status draft.",
        embedding_vector=[0.001] * dim,
        namespace="smoke-test",
    )
    print(result)
    print(f"\nTelemetry events: {len(core.telemetry.drain())}")
    print(core.telemetry.to_ndjson())
