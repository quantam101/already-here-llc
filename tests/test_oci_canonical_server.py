import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["CANONICAL_API_KEY"] = "test-api-key"
os.environ["CANONICAL_SQLITE_PATH"] = str(Path(tempfile.gettempdir()) / "oci-canonical-test.db")

from runtime import oci_canonical_server as server

server.state.store._conn.execute("DELETE FROM canonical_records")
server.state.store._conn.commit()

client = TestClient(server.app)


def test_health_requires_auth():
    response = client.get("/health")
    assert response.status_code == 401


def test_health_with_auth():
    response = client.get("/health", headers={"X-API-Key": "test-api-key"})
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["mode"] == "oci_canonical_graph_server"


def test_write_and_read():
    payload = {"table": "organizations", "id": "org_test123", "record": {"name": "Test Co"}}
    write_resp = client.post("/write", json=payload, headers={"X-API-Key": "test-api-key"})
    assert write_resp.status_code == 200

    read_resp = client.get("/read/organizations/org_test123", headers={"X-API-Key": "test-api-key"})
    assert read_resp.status_code == 200
    assert read_resp.json()["name"] == "Test Co"


def test_write_many_and_query():
    payload = {
        "writes": [
            {"table": "contacts", "id": "contact_a", "record": {"full_name": "A"}},
            {"table": "contacts", "id": "contact_b", "record": {"full_name": "B"}},
        ]
    }
    resp = client.post("/write-many", json=payload, headers={"X-API-Key": "test-api-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert len(data["insertedIds"]) == 2

    query_resp = client.get("/query/contacts", headers={"X-API-Key": "test-api-key"})
    assert query_resp.status_code == 200
    assert len(query_resp.json()) == 2


def test_backup_and_list():
    backup_resp = client.post("/backup", headers={"X-API-Key": "test-api-key"})
    assert backup_resp.status_code == 200
    backup_name = backup_resp.json()["backup_name"]

    list_resp = client.get("/backup/list", headers={"X-API-Key": "test-api-key"})
    assert list_resp.status_code == 200
    assert any(b["name"] == backup_name for b in list_resp.json()["backups"])
