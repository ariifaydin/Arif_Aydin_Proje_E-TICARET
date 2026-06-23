"""
Backend API tests for Heavy Vehicle Service Management.
Covers: health, auth, vehicles, appointments, service records, admin, AI chat (SSE), AI analyze.
"""
import os
import uuid
import time
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env
load_dotenv(Path("/app/frontend/.env"))
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@truckservis.com"
ADMIN_PASSWORD = "Admin123!"
CUSTOMER_EMAIL = "musteri@truckservis.com"
CUSTOMER_PASSWORD = "Musteri123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data


@pytest.fixture(scope="session")
def admin_auth(session):
    return _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def customer_auth(session):
    return _login(session, CUSTOMER_EMAIL, CUSTOMER_PASSWORD)


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_register_new_customer(self, session):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "name": "Test Kullanıcı",
            "phone": "+90 555 000 1111", "password": "Pass1234!"
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == "customer"

    def test_register_duplicate_email(self, session):
        # demo customer already exists
        r = session.post(f"{API}/auth/register", json={
            "email": CUSTOMER_EMAIL, "name": "x", "password": "x12345!"
        }, timeout=30)
        assert r.status_code == 400

    def test_login_admin(self, admin_auth):
        assert admin_auth["user"]["role"] == "admin"
        assert admin_auth["user"]["email"] == ADMIN_EMAIL

    def test_login_customer(self, customer_auth):
        assert customer_auth["user"]["role"] == "customer"
        assert customer_auth["user"]["email"] == CUSTOMER_EMAIL

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, session, customer_auth):
        r = session.get(f"{API}/auth/me", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == CUSTOMER_EMAIL

    def test_me_without_token(self, session):
        # Use a fresh session without auth header
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Vehicles ----------
class TestVehicles:
    def test_customer_sees_three_seeded_vehicles(self, session, customer_auth):
        r = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3, f"Expected >=3 vehicles, got {len(data)}"
        # Verify some seeded data
        plates = [v["plate"] for v in data]
        assert any("ABC 1453" in p for p in plates) or any("Actros" in v["model"] for v in data)

    def test_admin_sees_all_vehicles(self, session, admin_auth, customer_auth):
        r_admin = session.get(f"{API}/vehicles", headers=auth_headers(admin_auth["token"]), timeout=15)
        r_cust = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r_admin.status_code == 200
        assert r_cust.status_code == 200
        assert len(r_admin.json()) >= len(r_cust.json())

    def test_create_vehicle_uppercases_plate(self, session, customer_auth):
        payload = {
            "plate": "34 test 9999", "brand": "MAN", "model": "TGX",
            "year": 2022, "vin": "TESTVIN0001", "km": 12345
        }
        r = session.post(f"{API}/vehicles", json=payload,
                         headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200, r.text
        veh = r.json()
        assert veh["plate"] == "34 TEST 9999"
        assert veh["brand"] == "MAN"
        assert "id" in veh
        # Verify GET returns it
        r2 = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15)
        ids = [v["id"] for v in r2.json()]
        assert veh["id"] in ids
        # store for delete test
        pytest._created_vehicle_id = veh["id"]

    def test_delete_vehicle(self, session, customer_auth):
        vid = getattr(pytest, "_created_vehicle_id", None)
        assert vid, "Previous create test must run first"
        r = session.delete(f"{API}/vehicles/{vid}", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # Verify removal
        r2 = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15)
        ids = [v["id"] for v in r2.json()]
        assert vid not in ids


# ---------- Appointments ----------
class TestAppointments:
    def test_customer_appointments_seeded(self, session, customer_auth):
        r = session.get(f"{API}/appointments", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 2, f"Expected >=2 seeded appointments, got {len(data)}"

    def test_create_appointment_for_existing_vehicle(self, session, customer_auth):
        veh = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15).json()
        assert veh, "Need at least one vehicle"
        vid = veh[0]["id"]
        r = session.post(f"{API}/appointments", json={
            "vehicle_id": vid, "date": "2026-04-15", "time": "10:00", "issue": "TEST Periyodik bakım"
        }, headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200, r.text
        appt = r.json()
        assert appt["vehicle_id"] == vid
        assert appt["status"] == "beklemede"
        pytest._created_appointment_id = appt["id"]

    def test_create_appointment_nonexistent_vehicle(self, session, customer_auth):
        r = session.post(f"{API}/appointments", json={
            "vehicle_id": "nonexistent-id-xyz", "date": "2026-04-15", "time": "10:00", "issue": "X"
        }, headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 404

    def test_customer_can_cancel(self, session, customer_auth):
        aid = getattr(pytest, "_created_appointment_id", None)
        assert aid
        r = session.patch(f"{API}/appointments/{aid}", json={"status": "iptal"},
                          headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "iptal"

    def test_customer_cannot_set_other_status(self, session, customer_auth):
        aid = getattr(pytest, "_created_appointment_id", None)
        r = session.patch(f"{API}/appointments/{aid}", json={"status": "tamamlandı"},
                          headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 403

    def test_admin_can_change_status(self, session, admin_auth):
        aid = getattr(pytest, "_created_appointment_id", None)
        r = session.patch(f"{API}/appointments/{aid}", json={"status": "onaylandı"},
                          headers=auth_headers(admin_auth["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "onaylandı"


# ---------- Service Records ----------
class TestServiceRecords:
    def test_customer_sees_six_seeded_records(self, session, customer_auth):
        r = session.get(f"{API}/service-records", headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 6, f"Expected >=6 seeded records, got {len(data)}"

    def test_filter_by_vehicle(self, session, customer_auth):
        veh = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15).json()
        vid = veh[0]["id"]
        r = session.get(f"{API}/service-records?vehicle_id={vid}",
                        headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        for rec in r.json():
            assert rec["vehicle_id"] == vid

    def test_customer_cannot_create_service_record(self, session, customer_auth):
        veh = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15).json()
        vid = veh[0]["id"]
        cust_id = customer_auth["user"]["id"]
        r = session.post(f"{API}/service-records", json={
            "customer_id": cust_id, "vehicle_id": vid, "date": "2026-01-20",
            "repairs": "TEST", "parts_replaced": [], "technician_name": "T", "cost": 100.0
        }, headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 403

    def test_admin_can_create_service_record(self, session, admin_auth, customer_auth):
        veh = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15).json()
        vid = veh[0]["id"]
        cust_id = customer_auth["user"]["id"]
        r = session.post(f"{API}/service-records", json={
            "customer_id": cust_id, "vehicle_id": vid, "date": "2026-01-20",
            "repairs": "TEST Onarım", "parts_replaced": ["TEST parça"],
            "technician_name": "Test Tekn.", "technician_notes": "ok", "cost": 1000.0
        }, headers=auth_headers(admin_auth["token"]), timeout=20)
        assert r.status_code == 200, r.text
        sr = r.json()
        assert sr["repairs"] == "TEST Onarım"
        pytest._created_sr_id = sr["id"]


# ---------- Admin ----------
class TestAdmin:
    def test_admin_customers_requires_admin(self, session, customer_auth):
        r = session.get(f"{API}/admin/customers",
                        headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 403

    def test_admin_customers_list(self, session, admin_auth):
        r = session.get(f"{API}/admin/customers",
                        headers=auth_headers(admin_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        emails = [u["email"] for u in data]
        assert CUSTOMER_EMAIL in emails

    def test_admin_stats(self, session, admin_auth):
        r = session.get(f"{API}/admin/stats",
                        headers=auth_headers(admin_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        for key in ["customers", "vehicles", "appointments", "pending_appointments", "service_records"]:
            assert key in data
            assert isinstance(data[key], int)

    def test_admin_stats_forbidden_for_customer(self, session, customer_auth):
        r = session.get(f"{API}/admin/stats",
                        headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 403


# ---------- AI Chat (SSE streaming) ----------
class TestAIChat:
    def test_ai_chat_streaming(self, customer_auth):
        url = f"{API}/ai/chat"
        headers = auth_headers(customer_auth["token"])
        payload = {
            "session_id": f"test-session-{uuid.uuid4().hex[:6]}",
            "message": "Motor uyarı lambası yanıyor, ne kontrol etmeliyim?"
        }
        with requests.post(url, json=payload, headers=headers, stream=True, timeout=90) as r:
            assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"
            ct = r.headers.get("content-type", "")
            assert "text/event-stream" in ct, f"unexpected content-type: {ct}"
            data_lines = 0
            saw_done = False
            collected = ""
            start = time.time()
            for raw in r.iter_lines(decode_unicode=True):
                if raw is None:
                    continue
                if raw.startswith("data: "):
                    data_lines += 1
                    payload_text = raw[len("data: "):]
                    if payload_text == "[DONE]":
                        saw_done = True
                        break
                    collected += payload_text
                elif raw.startswith("event: done"):
                    pass
                if time.time() - start > 80:
                    break
            assert data_lines >= 1, "Expected at least one 'data: ' SSE line"
            assert len(collected) > 0 or saw_done


# ---------- AI Analyze ----------
class TestAIAnalyze:
    def test_analyze_vehicle_with_records(self, session, customer_auth):
        veh = session.get(f"{API}/vehicles", headers=auth_headers(customer_auth["token"]), timeout=15).json()
        # Find first vehicle that has service records
        target_vid = None
        for v in veh:
            recs = session.get(f"{API}/service-records?vehicle_id={v['id']}",
                               headers=auth_headers(customer_auth["token"]), timeout=15).json()
            if recs:
                target_vid = v["id"]
                break
        assert target_vid, "No vehicle with service records"
        r = session.post(f"{API}/ai/analyze/{target_vid}",
                         headers=auth_headers(customer_auth["token"]), timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "analysis" in data and isinstance(data["analysis"], str) and len(data["analysis"]) > 20
        assert data["vehicle_id"] == target_vid
        pytest._analyzed_vid = target_vid

    def test_analyze_vehicle_without_records_returns_400(self, session, customer_auth):
        # Create a new vehicle with no records
        r = session.post(f"{API}/vehicles", json={
            "plate": "06 NORC 1234", "brand": "Iveco", "model": "S-Way", "year": 2023, "km": 1000
        }, headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        vid = r.json()["id"]
        try:
            r2 = session.post(f"{API}/ai/analyze/{vid}",
                              headers=auth_headers(customer_auth["token"]), timeout=30)
            assert r2.status_code == 400, r2.text
        finally:
            session.delete(f"{API}/vehicles/{vid}", headers=auth_headers(customer_auth["token"]), timeout=15)

    def test_analyze_vehicle_not_owned_returns_404(self, session):
        # Register a fresh user and try to analyze the demo customer's vehicle
        email = f"TEST_other_{uuid.uuid4().hex[:6]}@example.com"
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        reg = s.post(f"{API}/auth/register", json={
            "email": email, "name": "Other", "password": "Pass1234!"
        }, timeout=15)
        assert reg.status_code == 200
        token = reg.json()["token"]
        # Use any seeded vehicle from demo customer (not owned by new user)
        cust_login = s.post(f"{API}/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        }, timeout=15).json()
        veh = s.get(f"{API}/vehicles", headers=auth_headers(cust_login["token"]), timeout=15).json()
        other_vid = veh[0]["id"]
        r = s.post(f"{API}/ai/analyze/{other_vid}",
                   headers=auth_headers(token), timeout=30)
        assert r.status_code == 404, r.text

    def test_list_analyses(self, session, customer_auth):
        vid = getattr(pytest, "_analyzed_vid", None)
        assert vid
        r = session.get(f"{API}/ai/analyses/{vid}",
                        headers=auth_headers(customer_auth["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def cleanup_after(request, session):
    yield
    # Best-effort cleanup
    try:
        admin = _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)
        h = auth_headers(admin["token"])
        sr_id = getattr(pytest, "_created_sr_id", None)
        if sr_id:
            session.delete(f"{API}/service-records/{sr_id}", headers=h, timeout=15)
    except Exception:
        pass
