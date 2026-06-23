"""
Heavy Vehicle Service Management - FastAPI Backend
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr, ConfigDict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "72"))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("backend")

# --- FastAPI ve CORS Kurulumu ---
app = FastAPI(title="Ağır Vasıta Servis Yönetimi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ---------- Models ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: Literal["customer", "admin"] = "customer"
    password_hash: str
    created_at: str = Field(default_factory=now_iso)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: str
    created_at: str


class RegisterReq(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    password: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class TokenResp(BaseModel):
    token: str
    user: UserPublic


class Vehicle(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    plate: str
    brand: str
    model: str
    year: int
    vin: Optional[str] = None
    km: int = 0
    created_at: str = Field(default_factory=now_iso)


class VehicleCreate(BaseModel):
    plate: str
    brand: str
    model: str
    year: int
    vin: Optional[str] = None
    km: int = 0
    customer_id: Optional[str] = None  # admin can set


class Appointment(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    vehicle_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    issue: str
    status: Literal["beklemede", "onaylandı", "tamamlandı", "iptal"] = "beklemede"
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class AppointmentCreate(BaseModel):
    vehicle_id: str
    date: str
    time: str
    issue: str
    customer_id: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[Literal["beklemede", "onaylandı", "tamamlandı", "iptal"]] = None
    notes: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None


class ServiceRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    vehicle_id: str
    date: str
    repairs: str
    parts_replaced: List[str] = []
    technician_name: str
    technician_notes: Optional[str] = None
    cost: float = 0.0
    module: Literal["engine", "turbo", "transmission", "brake", "electrical", "periodic", "other"] = "other"
    mileage: int = 0
    created_at: str = Field(default_factory=now_iso)


class ServiceRecordCreate(BaseModel):
    customer_id: str
    vehicle_id: str
    date: str
    repairs: str
    parts_replaced: List[str] = []
    technician_name: str
    technician_notes: Optional[str] = None
    cost: float = 0.0
    module: Literal["engine", "turbo", "transmission", "brake", "electrical", "periodic", "other"] = "other"
    mileage: int = 0


# ---------- Service Module Models ----------
ModuleKey = Literal["engine", "turbo", "transmission", "brake", "electrical", "periodic"]
Severity = Literal["düşük", "orta", "yüksek", "kritik"]
IssueStatus = Literal["açık", "devam ediyor", "çözüldü"]


class Issue(BaseModel):
    id: str = Field(default_factory=new_id)
    vehicle_id: str
    customer_id: str
    module: ModuleKey
    date: str
    description: str
    severity: Severity = "orta"
    status: IssueStatus = "açık"
    created_at: str = Field(default_factory=now_iso)


class IssueCreate(BaseModel):
    vehicle_id: str
    module: ModuleKey
    date: str
    description: str
    severity: Severity = "orta"
    status: IssueStatus = "açık"
    customer_id: Optional[str] = None


class IssueUpdate(BaseModel):
    status: Optional[IssueStatus] = None
    severity: Optional[Severity] = None
    description: Optional[str] = None


class MaintenanceTask(BaseModel):
    id: str = Field(default_factory=new_id)
    vehicle_id: str
    customer_id: str
    task_name: str
    interval_km: int  # how often (in km)
    last_done_km: int = 0
    last_done_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class MaintenanceTaskCreate(BaseModel):
    vehicle_id: str
    task_name: str
    interval_km: int
    last_done_km: int = 0
    last_done_date: Optional[str] = None
    notes: Optional[str] = None
    customer_id: Optional[str] = None


class AIAnalysis(BaseModel):
    id: str = Field(default_factory=new_id)
    customer_id: str
    vehicle_id: str
    analysis: str
    created_at: str = Field(default_factory=now_iso)


class ChatReq(BaseModel):
    session_id: str
    message: str


# ---------- Auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> User:
    if not creds:
        raise HTTPException(status_code=401, detail="Yetkilendirme gerekli")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return User(**doc)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekli")
    return user


def public(user: User) -> UserPublic:
    return UserPublic(id=user.id, email=user.email, name=user.name, phone=user.phone, role=user.role, created_at=user.created_at)


# ---------- Auth Routes ----------
@api.post("/auth/register", response_model=TokenResp)
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    user = User(
        email=req.email.lower(),
        name=req.name,
        phone=req.phone,
        password_hash=hash_password(req.password),
        role="customer",
    )
    await db.users.insert_one(user.model_dump())
    return TokenResp(token=create_token(user.id, user.role), user=public(user))


@api.post("/auth/login", response_model=TokenResp)
async def login(req: LoginReq):
    doc = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not doc or not verify_password(req.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    user = User(**doc)
    return TokenResp(token=create_token(user.id, user.role), user=public(user))


@api.get("/auth/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return public(user)


# ---------- Vehicles ----------
@api.get("/vehicles", response_model=List[Vehicle])
async def list_vehicles(user: User = Depends(get_current_user)):
    query = {} if user.role == "admin" else {"customer_id": user.id}
    docs = await db.vehicles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Vehicle(**d) for d in docs]


@api.post("/vehicles", response_model=Vehicle)
async def create_vehicle(body: VehicleCreate, user: User = Depends(get_current_user)):
    customer_id = body.customer_id if (user.role == "admin" and body.customer_id) else user.id
    v = Vehicle(customer_id=customer_id, plate=body.plate.upper(), brand=body.brand,
                model=body.model, year=body.year, vin=body.vin, km=body.km)
    await db.vehicles.insert_one(v.model_dump())
    return v


@api.delete("/vehicles/{vid}")
async def delete_vehicle(vid: str, user: User = Depends(get_current_user)):
    q = {"id": vid} if user.role == "admin" else {"id": vid, "customer_id": user.id}
    res = await db.vehicles.delete_one(q)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return {"ok": True}


# ---------- Appointments ----------
@api.get("/appointments", response_model=List[Appointment])
async def list_appointments(user: User = Depends(get_current_user)):
    query = {} if user.role == "admin" else {"customer_id": user.id}
    docs = await db.appointments.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [Appointment(**d) for d in docs]


@api.post("/appointments", response_model=Appointment)
async def create_appointment(body: AppointmentCreate, user: User = Depends(get_current_user)):
    customer_id = body.customer_id if (user.role == "admin" and body.customer_id) else user.id
    veh = await db.vehicles.find_one({"id": body.vehicle_id}, {"_id": 0})
    if not veh:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    if user.role != "admin" and veh["customer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Bu araç size ait değil")
    a = Appointment(customer_id=customer_id, vehicle_id=body.vehicle_id,
                    date=body.date, time=body.time, issue=body.issue)
    await db.appointments.insert_one(a.model_dump())
    return a


@api.patch("/appointments/{aid}", response_model=Appointment)
async def update_appointment(aid: str, body: AppointmentUpdate, user: User = Depends(get_current_user)):
    q = {"id": aid} if user.role == "admin" else {"id": aid, "customer_id": user.id}
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    if user.role != "admin" and "status" in update and update["status"] != "iptal":
        raise HTTPException(status_code=403, detail="Sadece yöneticiler durum güncelleyebilir")
    res = await db.appointments.find_one_and_update(q, {"$set": update}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    res.pop("_id", None)
    return Appointment(**res)


# ---------- Service Records ----------
@api.get("/service-records", response_model=List[ServiceRecord])
async def list_service_records(vehicle_id: Optional[str] = None, user: User = Depends(get_current_user)):
    query: dict = {}
    if user.role != "admin":
        query["customer_id"] = user.id
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    docs = await db.service_records.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [ServiceRecord(**d) for d in docs]


@api.post("/service-records", response_model=ServiceRecord)
async def create_service_record(body: ServiceRecordCreate, _: User = Depends(require_admin)):
    sr = ServiceRecord(**body.model_dump())
    await db.service_records.insert_one(sr.model_dump())
    return sr


@api.delete("/service-records/{sid}")
async def delete_service_record(sid: str, _: User = Depends(require_admin)):
    res = await db.service_records.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return {"ok": True}


# ---------- Admin: Customers ----------
@api.get("/admin/customers", response_model=List[UserPublic])
async def admin_list_customers(_: User = Depends(require_admin)):
    docs = await db.users.find({"role": "customer"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserPublic(**d) for d in docs]


# ---------- AI Assistant ----------
AI_SYSTEM_PROMPT = """Sen ağır vasıta tamirinde uzmanlaşmış teknik danışmansın..."""
ANALYSIS_PROMPT = """Aşağıdaki ağır vasıta servis geçmişini analiz et..."""


def _llm_chat(session_id: str, system_msg: str = AI_SYSTEM_PROMPT):
    from emergentintegrations.llm.chat import LlmChat
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")


@api.post("/ai/chat")
async def ai_chat(req: ChatReq, user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import UserMessage, TextDelta, StreamDone
    await db.chat_messages.insert_one({
        "id": new_id(), "customer_id": user.id, "session_id": req.session_id,
        "role": "user", "content": req.message, "created_at": now_iso()
    })
    chat = _llm_chat(req.session_id)

    async def event_gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    safe = ev.content.replace("\\", "\\\\").replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("AI chat error")
            err_safe = str(e).replace("\n", " ")
            yield f"data: [HATA] {err_safe}\n\n"
        await db.chat_messages.insert_one({
            "id": new_id(), "customer_id": user.id, "session_id": req.session_id,
            "role": "assistant", "content": full, "created_at": now_iso()
        })
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api.get("/ai/chat/{session_id}")
async def get_chat_history(session_id: str, user: User = Depends(get_current_user)):
    docs = await db.chat_messages.find(
        {"customer_id": user.id, "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    return docs


@api.post("/ai/analyze/{vehicle_id}", response_model=AIAnalysis)
async def ai_analyze(vehicle_id: str, user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import UserMessage
    veh_q = {"id": vehicle_id} if user.role == "admin" else {"id": vehicle_id, "customer_id": user.id}
    veh = await db.vehicles.find_one(veh_q, {"_id": 0})
    if not veh:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    records = await db.service_records.find({"vehicle_id": vehicle_id}, {"_id": 0}).sort("date", -1).to_list(500)
    if not records:
        raise HTTPException(status_code=400, detail="Bu araç için servis kaydı yok")

    history_text = "\n".join([
        f"- {r['date']} | Onarım: {r['repairs']} | Parçalar: {', '.join(r.get('parts_replaced', []))} | Notlar: {r.get('technician_notes','')} | Maliyet: {r.get('cost',0)} TL"
        for r in records
    ])
    veh_label = f"Araç: {veh['brand']} {veh['model']} ({veh['year']}) - Plaka {veh['plate']}"
    prompt = f"{veh_label}\n\n" + ANALYSIS_PROMPT.format(history=history_text)

    chat = _llm_chat(f"analysis-{vehicle_id}", system_msg="Sen ağır vasıta servis veri analisti uzmanısın. Her zaman TÜRKÇE cevap ver.")
    full = ""
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        full = resp if isinstance(resp, str) else str(resp)
    except Exception as e:
        logger.exception("AI analyze error")
        raise HTTPException(status_code=500, detail=f"AI analizi başarısız: {e}")

    rec = AIAnalysis(customer_id=veh["customer_id"], vehicle_id=vehicle_id, analysis=full)
    await db.ai_analyses.insert_one(rec.model_dump())
    return rec


@api.get("/ai/analyses/{vehicle_id}", response_model=List[AIAnalysis])
async def list_analyses(vehicle_id: str, user: User = Depends(get_current_user)):
    veh_q = {"id": vehicle_id} if user.role == "admin" else {"id": vehicle_id, "customer_id": user.id}
    veh = await db.vehicles.find_one(veh_q, {"_id": 0})
    if not veh:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    docs = await db.ai_analyses.find({"vehicle_id": vehicle_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AIAnalysis(**d) for d in docs]


# ---------- Issues ----------
MODULE_LABELS = {
    "engine": "Motor Sistemi",
    "turbo": "Turbo Sistemi",
    "transmission": "Şanzıman Sistemi",
    "brake": "Fren Sistemi",
    "electrical": "Elektrik Diagnostiği",
    "periodic": "Periyodik Bakım",
}


async def _check_vehicle_access(vehicle_id: str, user: User) -> dict:
    q = {"id": vehicle_id} if user.role == "admin" else {"id": vehicle_id, "customer_id": user.id}
    veh = await db.vehicles.find_one(q, {"_id": 0})
    if not veh:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return veh


@api.get("/issues", response_model=List[Issue])
async def list_issues(vehicle_id: Optional[str] = None, module: Optional[str] = None, user: User = Depends(get_current_user)):
    query: dict = {} if user.role == "admin" else {"customer_id": user.id}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if module:
        query["module"] = module
    docs = await db.issues.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [Issue(**d) for d in docs]


@api.post("/issues", response_model=Issue)
async def create_issue(body: IssueCreate, user: User = Depends(get_current_user)):
    veh = await _check_vehicle_access(body.vehicle_id, user)
    customer_id = body.customer_id if (user.role == "admin" and body.customer_id) else veh["customer_id"]
    issue = Issue(
        vehicle_id=body.vehicle_id, customer_id=customer_id, module=body.module,
        date=body.date, description=body.description,
        severity=body.severity, status=body.status,
    )
    await db.issues.insert_one(issue.model_dump())
    return issue


@api.patch("/issues/{iid}", response_model=Issue)
async def update_issue(iid: str, body: IssueUpdate, user: User = Depends(get_current_user)):
    q = {"id": iid} if user.role == "admin" else {"id": iid, "customer_id": user.id}
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    res = await db.issues.find_one_and_update(q, {"$set": update}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Sorun bulunamadı")
    res.pop("_id", None)
    return Issue(**res)


@api.delete("/issues/{iid}")
async def delete_issue(iid: str, user: User = Depends(get_current_user)):
    q = {"id": iid} if user.role == "admin" else {"id": iid, "customer_id": user.id}
    res = await db.issues.delete_one(q)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sorun bulunamadı")
    return {"ok": True}


# ---------- Maintenance Tasks ----------
@api.get("/maintenance-tasks", response_model=List[MaintenanceTask])
async def list_maintenance_tasks(vehicle_id: Optional[str] = None, user: User = Depends(get_current_user)):
    query: dict = {} if user.role == "admin" else {"customer_id": user.id}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    docs = await db.maintenance_tasks.find(query, {"_id": 0}).sort("task_name", 1).to_list(1000)
    return [MaintenanceTask(**d) for d in docs]


@api.post("/maintenance-tasks", response_model=MaintenanceTask)
async def create_maintenance_task(body: MaintenanceTaskCreate, user: User = Depends(get_current_user)):
    veh = await _check_vehicle_access(body.vehicle_id, user)
    customer_id = body.customer_id if (user.role == "admin" and body.customer_id) else veh["customer_id"]
    task = MaintenanceTask(
        vehicle_id=body.vehicle_id, customer_id=customer_id, task_name=body.task_name,
        interval_km=body.interval_km, last_done_km=body.last_done_km,
        last_done_date=body.last_done_date, notes=body.notes,
    )
    await db.maintenance_tasks.insert_one(task.model_dump())
    return task


# ---------- Module Aggregate ----------
@api.get("/vehicles/{vehicle_id}/modules/{module_key}")
async def get_module(vehicle_id: str, module_key: str, user: User = Depends(get_current_user)):
    if module_key not in MODULE_LABELS:
        raise HTTPException(status_code=400, detail="Geçersiz modül")
    veh = await _check_vehicle_access(vehicle_id, user)

    issues = await db.issues.find({"vehicle_id": vehicle_id, "module": module_key}, {"_id": 0}).sort("date", -1).to_list(500)
    records = await db.service_records.find({"vehicle_id": vehicle_id, "module": module_key}, {"_id": 0}).sort("date", -1).to_list(500)

    six_months_ago = (datetime.now(timezone.utc) - timedelta(days=180)).date().isoformat()
    recent_repairs = [r for r in records if r["date"] >= six_months_ago]
    recurring = None
    if len(recent_repairs) >= 2:
        recurring = {
            "count": len(recent_repairs),
            "period": "son 6 ay",
            "message": f"{MODULE_LABELS[module_key]} arızası son 6 ayda {len(recent_repairs)} kez tekrarladı",
            "severity": "yüksek" if len(recent_repairs) >= 3 else "orta",
        }

    maintenance = []
    if module_key == "periodic":
        m_docs = await db.maintenance_tasks.find({"vehicle_id": vehicle_id}, {"_id": 0}).to_list(500)
        for m in m_docs:
            next_due_km = (m.get("last_done_km") or 0) + m["interval_km"]
            remaining = next_due_km - veh["km"]
            status = "gecikmiş" if remaining < 0 else ("yaklaşıyor" if remaining < 5000 else "uygun")
            maintenance.append({**m, "next_due_km": next_due_km, "remaining_km": remaining, "status": status})

    return {
        "module_key": module_key,
        "module_label": MODULE_LABELS[module_key],
        "vehicle": veh,
        "issues": issues,
        "service_records": records,
        "recurring": recurring,
        "maintenance_tasks": maintenance,
    }


# ---------- Module-scoped AI ----------
@api.post("/ai/module-analyze/{vehicle_id}/{module_key}")
async def ai_module_analyze(vehicle_id: str, module_key: str, user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import UserMessage
    if module_key not in MODULE_LABELS:
        raise HTTPException(status_code=400, detail="Geçersiz modül")
    veh = await _check_vehicle_access(vehicle_id, user)

    issues = await db.issues.find({"vehicle_id": vehicle_id, "module": module_key}, {"_id": 0}).sort("date", -1).to_list(200)
    records = await db.service_records.find({"vehicle_id": vehicle_id, "module": module_key}, {"_id": 0}).sort("date", -1).to_list(200)

    if not issues and not records:
        raise HTTPException(status_code=400, detail="Bu modül için kayıt bulunamadı")

    module_label = MODULE_LABELS[module_key]
    issues_text = "\n".join([f"- {i['date']} | {i['description']} | Şiddet: {i['severity']} | Durum: {i['status']}" for i in issues]) or "Kayıtlı sorun yok"
    records_text = "\n".join([f"- {r['date']} | Onarım: {r['repairs']} | Parçalar: {', '.join(r.get('parts_replaced', []))} | KM: {r.get('mileage', 0)} | Maliyet: {r.get('cost', 0)} TL" for r in records]) or "Kayıtlı onarım yok"

    prompt = f"Araç: {veh['brand']}... Analiz Modülü: {module_label}..."

    chat = _llm_chat(f"module-{vehicle_id}-{module_key}", system_msg=f"Sen ağır vasıta '{module_label}' uzmanısın...")
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        analysis_text = resp if isinstance(resp, str) else str(resp)
    except Exception as e:
        logger.exception("Module AI analyze error")
        raise HTTPException(status_code=500, detail=f"AI analizi başarısız: {e}")

    rec = AIAnalysis(customer_id=veh["customer_id"], vehicle_id=vehicle_id, analysis=analysis_text)
    doc = rec.model_dump()
    doc["module"] = module_key
    await db.ai_analyses.insert_one(dict(doc))
    return {**doc, "module_label": module_label}


# ---------- Stats ----------
@api.get("/admin/stats")
async def admin_stats(_: User = Depends(require_admin)):
    customers = await db.users.count_documents({"role": "customer"})
    vehicles = await db.vehicles.count_documents({})
    appointments = await db.appointments.count_documents({})
    pending = await db.appointments.count_documents({"status": "beklemede"})
    completed = await db.service_records.count_documents({})
    return {"customers": customers, "vehicles": vehicles, "appointments": appointments, "pending_appointments": pending, "service_records": completed}


# ---------- Seed Data ----------
async def seed():
    admin_email = "admin@truckservis.com"
    if not await db.users.find_one({"email": admin_email}):
        admin = User(email=admin_email, name="Yönetici", phone="+90 555 000 0000", role="admin", password_hash=hash_password("Admin123!"))
        await db.users.insert_one(admin.model_dump())

    demo_email = "musteri@truckservis.com"
    cust_doc = await db.users.find_one({"email": demo_email})
    if not cust_doc:
        customer = User(email=demo_email, name="Ahmet Yılmaz", phone="+90 532 111 2233", role="customer", password_hash=hash_password("Musteri123!"))
        await db.users.insert_one(customer.model_dump())
        cust_doc = customer.model_dump()

    cust_id = cust_doc["id"]

    if await db.vehicles.count_documents({"customer_id": cust_id}) == 0:
        v1 = Vehicle(customer_id=cust_id, plate="34 ABC 1453", brand="Mercedes-Benz", model="Actros 1845", year=2020, km=425000)
        v2 = Vehicle(customer_id=cust_id, plate="06 TIR 0641", brand="Scania", model="R 500", year=2019, km=612000)
        v3 = Vehicle(customer_id=cust_id, plate="35 KMY 2024", brand="Volvo", model="FH 460", year=2021, km=287000)
        for v in (v1, v2, v3):
            await db.vehicles.insert_one(v.model_dump())


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
    except Exception as e:
        logger.exception(f"Seed failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- E-Ticaret API Endpointleri ----------
# Pydantic modellerini doğrudan server.py içinden veya doğru klasörden alıyoruz
class ProductCreate(BaseModel):
    title: str
    description: str
    category: Literal["motor", "turbo", "sanziman", "fren", "elektrik", "aksesuar", "diger"]
    price: float
    stock: int
    brand: str

class Product(ProductCreate):
    id: str = Field(default_factory=new_id)

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class Cart(BaseModel):
    customer_id: str
    items: List[CartItem] = []

@api.get("/products", response_model=List[Product])
@api.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    cursor = db.products.find(query)
    products = []
    async for doc in cursor:
        # MongoDB'nin ObjectId tipini Pydantic'in anlayacağı string (str) tipine dönüştürüyoruz
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
        elif "id" in doc:
            doc["id"] = str(doc["id"])
            
        products.append(Product(**doc))
    return products
    query = {}
    if category:
        query["category"] = category
    cursor = db.products.find(query)
    products = []
    async for doc in cursor:
        doc["id"] = doc.get("_id", doc.get("id"))
        products.append(Product(**doc))
    return products

@api.post("/products", response_model=Product)
async def create_product(payload: ProductCreate):
    p = Product(**payload.model_dump())
    doc = p.model_dump()
    doc["_id"] = p.id
    await db.products.insert_one(doc)
    return p

@api.get("/cart/{customer_id}", response_model=Cart)
async def get_cart(customer_id: str):
    doc = await db.carts.find_one({"customer_id": customer_id})
    if not doc:
        return Cart(customer_id=customer_id, items=[])
    return Cart(**doc)

@api.post("/cart/{customer_id}/add")
async def add_to_cart(customer_id: str, item: CartItem):
    cart_doc = await db.carts.find_one({"customer_id": customer_id})
    if not cart_doc:
        cart = Cart(customer_id=customer_id, items=[item])
        await db.carts.insert_one(cart.model_dump())
    else:
        items = cart_doc.get("items", [])
        found = False
        for i in items:
            if i["product_id"] == item.product_id:
                i["quantity"] += item.quantity
                found = True
                break
        if not found:
            items.append(item.model_dump())
        await db.carts.update_one({"customer_id": customer_id}, {"$set": {"items": items, "updated_at": now_iso()}})
    return {"status": "success"}


@api.get("/")
async def health():
    return {"status": "ok", "service": "heavy-vehicle-service-api"}


app.include_router(api)