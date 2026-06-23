"""
Tests for new Service Modules system:
- Issues CRUD with ownership
- Maintenance Tasks
- Module aggregate (engine/turbo/transmission/brake/electrical/periodic)
- Module-scoped AI analyze
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/frontend/.env"))
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@truckservis.com"
ADMIN_PASSWORD = "Admin123!"
CUSTOMER_EMAIL = "musteri@truckservis.com"
CUSTOMER_PASSWORD = "Musteri123!"

MERCEDES_PLATE = "34 ABC 1453"
MODULE_KEYS = ["engine", "turbo", "transmission", "brake", "electrical", "periodic"]


def _headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def customer_token(session):
    r = session.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def mercedes_vehicle(session, customer_token):
    """Find the Mercedes Actros vehicle by plate '34 ABC 1453'."""
    r = session.get(f"{API}/vehicles", headers=_headers(customer_token), timeout=15)
    assert r.status_code == 200
    for v in r.json():
        if v["plate"] == MERCEDES_PLATE:
            return v
    pytest.fail(f"Mercedes Actros with plate {MERCEDES_PLATE} not found in seed data")


@pytest.fixture(scope="session")
def other_customer_token(session):
    """A fresh, unrelated customer who does NOT own the demo vehicles."""
    email = f"TEST_other_{uuid.uuid4().hex[:6]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "name": "Other", "password": "Pass1234!"
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Issues ----------
class TestIssues:
    def test_list_issues_customer(self, session, customer_token):
        r = session.get(f"{API}/issues", headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # seeded issues should exist
        assert len(data) >= 10, f"Expected >=10 seeded issues, got {len(data)}"

    def test_list_issues_filter_by_vehicle(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/issues?vehicle_id={mercedes_vehicle['id']}",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        for iss in data:
            assert iss["vehicle_id"] == mercedes_vehicle["id"]

    def test_list_issues_filter_by_module(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/issues?vehicle_id={mercedes_vehicle['id']}&module=turbo",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3, f"Expected >=3 turbo issues, got {len(data)}"
        for iss in data:
            assert iss["module"] == "turbo"

    def test_create_issue_for_owned_vehicle(self, session, customer_token, mercedes_vehicle):
        payload = {
            "vehicle_id": mercedes_vehicle["id"],
            "module": "engine",
            "date": "2026-02-10",
            "description": "TEST_ISSUE motor titremesi",
            "severity": "orta",
            "status": "açık",
        }
        r = session.post(f"{API}/issues", json=payload, headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200, r.text
        iss = r.json()
        assert iss["description"] == "TEST_ISSUE motor titremesi"
        assert iss["module"] == "engine"
        assert iss["customer_id"]  # filled from vehicle ownership
        pytest._created_issue_id = iss["id"]

    def test_create_issue_for_unowned_vehicle_returns_404(self, session, other_customer_token, mercedes_vehicle):
        r = session.post(f"{API}/issues", json={
            "vehicle_id": mercedes_vehicle["id"],
            "module": "engine", "date": "2026-02-10",
            "description": "TEST should be rejected",
        }, headers=_headers(other_customer_token), timeout=15)
        assert r.status_code == 404, r.text

    def test_patch_issue_customer_own(self, session, customer_token):
        iid = getattr(pytest, "_created_issue_id", None)
        assert iid
        r = session.patch(f"{API}/issues/{iid}", json={"status": "çözüldü", "severity": "düşük"},
                          headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200, r.text
        iss = r.json()
        assert iss["status"] == "çözüldü"
        assert iss["severity"] == "düşük"

    def test_patch_issue_admin_can_update_any(self, session, admin_token):
        iid = getattr(pytest, "_created_issue_id", None)
        assert iid
        r = session.patch(f"{API}/issues/{iid}", json={"description": "TEST_ISSUE updated by admin"},
                          headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["description"] == "TEST_ISSUE updated by admin"

    def test_patch_issue_other_customer_returns_404(self, session, other_customer_token):
        iid = getattr(pytest, "_created_issue_id", None)
        r = session.patch(f"{API}/issues/{iid}", json={"status": "açık"},
                          headers=_headers(other_customer_token), timeout=15)
        assert r.status_code == 404

    def test_delete_issue(self, session, customer_token):
        iid = getattr(pytest, "_created_issue_id", None)
        assert iid
        r = session.delete(f"{API}/issues/{iid}", headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # verify gone
        r2 = session.delete(f"{API}/issues/{iid}", headers=_headers(customer_token), timeout=15)
        assert r2.status_code == 404


# ---------- Maintenance Tasks ----------
class TestMaintenanceTasks:
    def test_list_tasks_for_mercedes(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/maintenance-tasks?vehicle_id={mercedes_vehicle['id']}",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 5, f"Expected >=5 maintenance tasks for Mercedes, got {len(data)}"
        for t in data:
            assert t["vehicle_id"] == mercedes_vehicle["id"]

    def test_create_task_for_owned_vehicle(self, session, customer_token, mercedes_vehicle):
        payload = {
            "vehicle_id": mercedes_vehicle["id"],
            "task_name": "TEST_TASK Kayış kontrolü",
            "interval_km": 60000,
            "last_done_km": 400000,
            "last_done_date": "2025-09-01",
        }
        r = session.post(f"{API}/maintenance-tasks", json=payload,
                         headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["task_name"] == "TEST_TASK Kayış kontrolü"
        assert t["interval_km"] == 60000

    def test_create_task_for_unowned_vehicle_returns_404(self, session, other_customer_token, mercedes_vehicle):
        r = session.post(f"{API}/maintenance-tasks", json={
            "vehicle_id": mercedes_vehicle["id"],
            "task_name": "X", "interval_km": 10000,
        }, headers=_headers(other_customer_token), timeout=15)
        assert r.status_code == 404


# ---------- Module Aggregate ----------
class TestModuleAggregate:
    @pytest.mark.parametrize("key", MODULE_KEYS)
    def test_get_module_for_each_key(self, session, customer_token, mercedes_vehicle, key):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/{key}",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for field in ["vehicle", "issues", "service_records", "recurring", "maintenance_tasks", "module_label"]:
            assert field in data, f"Missing field {field} in module {key}"
        assert data["module_key"] == key
        # vehicle should not contain mongo _id
        assert "_id" not in data["vehicle"]

    def test_invalid_module_returns_400(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/invalid",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 400, r.text

    def test_module_for_unowned_vehicle_returns_404(self, session, other_customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/engine",
                        headers=_headers(other_customer_token), timeout=15)
        assert r.status_code == 404

    def test_engine_module_has_3plus_issues(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/engine",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data["issues"]) >= 3, f"Engine should have >=3 issues, got {len(data['issues'])}"

    def test_turbo_module_has_issues_records_and_recurring(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/turbo",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data["issues"]) >= 3, f"Turbo expected >=3 issues, got {len(data['issues'])}"
        assert len(data["service_records"]) >= 2, f"Turbo expected >=2 records, got {len(data['service_records'])}"
        assert data["recurring"] is not None, "Turbo should have recurring detection"
        assert data["recurring"]["count"] >= 2
        assert "son 6 ay" in data["recurring"].get("period", "")
        assert data["module_label"] == "Turbo Sistemi"

    def test_brake_module_has_3plus_issues_and_record(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/brake",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data["issues"]) >= 3
        assert len(data["service_records"]) >= 1

    def test_periodic_module_has_maintenance_with_fields(self, session, customer_token, mercedes_vehicle):
        r = session.get(f"{API}/vehicles/{mercedes_vehicle['id']}/modules/periodic",
                        headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        mt = data["maintenance_tasks"]
        assert len(mt) >= 5, f"Periodic expected >=5 maintenance tasks, got {len(mt)}"
        for t in mt:
            assert "status" in t
            assert "next_due_km" in t
            assert "remaining_km" in t
            assert t["status"] in ("gecikmiş", "yaklaşıyor", "uygun")


# ---------- Module-scoped AI Analyze ----------
class TestModuleAIAnalyze:
    def test_module_analyze_turbo_returns_analysis(self, session, customer_token, mercedes_vehicle):
        r = session.post(f"{API}/ai/module-analyze/{mercedes_vehicle['id']}/turbo",
                         headers=_headers(customer_token), timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "analysis" in data and isinstance(data["analysis"], str)
        assert len(data["analysis"]) > 30, f"Analysis too short: {data['analysis']!r}"
        assert data.get("module_label") == "Turbo Sistemi"

    def test_module_analyze_empty_module_returns_400(self, session, customer_token):
        """Create a fresh vehicle with no issues or records and try to analyze a module."""
        r = session.post(f"{API}/vehicles", json={
            "plate": "06 EMPTY 0001", "brand": "DAF", "model": "XF", "year": 2024, "km": 10
        }, headers=_headers(customer_token), timeout=15)
        assert r.status_code == 200
        vid = r.json()["id"]
        try:
            r2 = session.post(f"{API}/ai/module-analyze/{vid}/engine",
                              headers=_headers(customer_token), timeout=30)
            assert r2.status_code == 400, r2.text
        finally:
            session.delete(f"{API}/vehicles/{vid}", headers=_headers(customer_token), timeout=15)

    def test_module_analyze_invalid_module_returns_400(self, session, customer_token, mercedes_vehicle):
        r = session.post(f"{API}/ai/module-analyze/{mercedes_vehicle['id']}/invalid",
                         headers=_headers(customer_token), timeout=30)
        assert r.status_code == 400

    def test_module_analyze_unowned_vehicle_returns_404(self, session, other_customer_token, mercedes_vehicle):
        r = session.post(f"{API}/ai/module-analyze/{mercedes_vehicle['id']}/turbo",
                         headers=_headers(other_customer_token), timeout=30)
        assert r.status_code == 404
