import asyncio

import pytest

from runtime.cost_guard import CostGuard
from runtime.swarm_engine import (
    AutonomousSwarmOrchestrator,
    DeclarativeExecutionPlan,
    DistributedExecutionMatrix,
    FailoverInferenceGateway,
    MetricAssertion,
    SecurityEnforcer,
    SecurityError,
)


@pytest.fixture(autouse=True)
def _isolate_state(tmp_path, monkeypatch):
    monkeypatch.setenv("GMAOS_AUDIT_LOG", str(tmp_path / "audit.jsonl"))
    monkeypatch.setenv("GMAOS_MODE", "strict_zero_spend")
    monkeypatch.setenv("GMAOS_PAID_ADAPTERS_ENABLED", "false")


def test_metric_assertion_rejects_unknown_type():
    with pytest.raises(ValueError):
        MetricAssertion(column="revenue", assertion_type="not_a_real_type")


def test_plan_from_dict_parses_assertions():
    plan = DeclarativeExecutionPlan.from_dict(
        {
            "analytical_rationale": "r",
            "pure_python_script": "print('ok')",
            "data_quality_assertions": [
                {"column": "revenue", "assertion_type": "not_null", "parameters": {}}
            ],
        }
    )
    assert plan.pure_python_script == "print('ok')"
    assert len(plan.data_quality_assertions) == 1
    assert plan.data_quality_assertions[0].column == "revenue"


def test_security_enforcer_blocks_prohibited_signatures():
    for bad in ["import os", "import sys", "subprocess.run('x')", "eval('1')", "open('/etc/passwd')"]:
        with pytest.raises(SecurityError):
            SecurityEnforcer.verify_and_inject(bad, [])


def test_security_enforcer_strips_fences_and_injects_assertions():
    code = "```python\nx = 1\n```"
    hardened = SecurityEnforcer.verify_and_inject(
        code, [MetricAssertion(column="revenue", assertion_type="not_null")]
    )
    assert "import pandas as pd" in hardened
    assert "x = 1" in hardened
    assert "AUTOMATED INVARIANT ASSERTIONS" in hardened
    assert "df['revenue'].isnull().sum() == 0" in hardened


def test_gateway_is_local_first_in_zero_spend():
    gateway = FailoverInferenceGateway(CostGuard())
    assert gateway.cloud_active is False
    raw = asyncio.run(gateway.generate_inference("p", "fallback prompt"))
    plan = DeclarativeExecutionPlan.from_dict(__import__("json").loads(raw))
    assert "fallback prompt" in plan.pure_python_script


def test_local_isolated_executor_runs_code():
    out, ok = asyncio.run(
        DistributedExecutionMatrix.run_payload("print('hello-swarm')", is_online=False)
    )
    assert ok is True
    assert "hello-swarm" in out


def test_local_isolated_executor_reports_failure():
    out, ok = asyncio.run(
        DistributedExecutionMatrix.run_payload("raise ValueError('boom')", is_online=False)
    )
    assert ok is False
    assert "boom" in out


def test_parallel_swarm_local_fallback_succeeds():
    orchestrator = AutonomousSwarmOrchestrator(session_id="test")
    results = orchestrator.run_swarm(
        ["summarize revenue", "detect anomalies"],
        schema_ctx="columns: revenue",
    )
    assert len(results) == 2
    assert all(r["status"] == "success" for r in results)
    assert all("Local deterministic verification" in r["telemetry"] for r in results)


def test_swarm_rejects_unsafe_generated_plan(monkeypatch):
    orchestrator = AutonomousSwarmOrchestrator(session_id="test")

    async def _malicious(prompt, fallback_prompt):
        return __import__("json").dumps(
            {
                "analytical_rationale": "bad",
                "pure_python_script": "import os\nos.listdir('/')",
                "data_quality_assertions": [],
            }
        )

    monkeypatch.setattr(orchestrator.gateway, "generate_inference", _malicious)
    result = asyncio.run(orchestrator.orchestrate_node_task("q", "ctx"))
    assert result["status"] == "rejected"
