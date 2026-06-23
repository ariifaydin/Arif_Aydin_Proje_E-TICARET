# Heavy Vehicle Service Management — PRD

## Original Problem Statement
Modern, responsive website (Turkish) for a Heavy Vehicle Service Management System used by a private truck and commercial vehicle repair service. Must include: home, customer portal, appointment system, vehicle service history, AI heavy-vehicle assistant, AI service-record analysis, admin panel, full DB structure, dark/light mode, and realistic demo data.

## User Choices (confirmed)
- AI model: Claude Sonnet 4.5 (Anthropic) via Emergent Universal LLM Key
- Authentication: Simple email/password JWT
- Language: Turkish (Türkçe) — entire UI
- Design: Dark industrial / orange-accent automotive / modern minimal (dark default + light toggle)
- Seeded admin account: yes

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), Motor (async MongoDB), JWT (`pyjwt`), bcrypt password hashing, `emergentintegrations` for Claude Sonnet 4.5 chat + streaming SSE.
- **Frontend**: React 19 + react-router 7, TailwindCSS 3, Shadcn primitives, lucide-react icons. Fonts: Barlow Condensed (headings) / Manrope (body) / Roboto Mono (technical readouts).
- **DB**: MongoDB `heavy_vehicle_service` with collections: `users`, `vehicles`, `appointments`, `service_records`, `chat_messages`, `ai_analyses`.
- **Hosting**: Supervisor (backend on 0.0.0.0:8001, frontend on 3000). All API routes prefixed with `/api`.

## Personas
1. **Customer (Müşteri)** — fleet operator with one or more heavy vehicles. Needs to track service history, book appointments, and get AI diagnostic advice.
2. **Admin (Yönetici)** — service center staff. Manages customers, vehicles, appointments, service records.

## Core Requirements (delivered Feb 2026)
- Public marketing pages (Home/Services/Contact) — bento layout, Turkish content.
- Registration & login (JWT bearer, 72h expiry).
- Customer portal:
  - Vehicle list, add/delete vehicle
  - Service history with vehicle filter & total cost
  - Appointments (book / view / cancel)
  - AI Assistant chat (streaming SSE, Turkish-only)
  - AI Service Record Analysis (one-click per vehicle)
- Admin panel with tabs (Stats, Customers, Vehicles, Appointments, Service Records). Admin can update appointment status and create service records.
- Dark/light mode toggle (persisted to localStorage; dark default).
- Seeded demo data: 1 admin, 1 customer, 3 vehicles, 6 service records, 2 appointments.

## What's Been Implemented (2026-02-08)
- All endpoints + UI as listed above.
- 31/31 backend tests passing (auth, vehicles, appointments, service records, admin, AI chat streaming, AI analyze).
- Fixed authorization gap: customers can no longer create appointments on someone else's vehicle.

## Iteration 2 (2026-02-08): Modular Service Sections
- **New backend models**: `Issue` (vehicle_id, module, date, description, severity, status), `MaintenanceTask` (interval_km, last_done_km, next_due tracking). ServiceRecord gained `module` and `mileage` fields.
- **New endpoints**:
  - `GET/POST/PATCH/DELETE /api/issues` — module-scoped problem tracking with severity (düşük/orta/yüksek/kritik) + status (açık/devam ediyor/çözüldü).
  - `GET/POST /api/maintenance-tasks` — scheduled maintenance with overdue/upcoming/ok status.
  - `GET /api/vehicles/{id}/modules/{key}` — aggregated module view (issues + service_records + recurring detection + maintenance_tasks).
  - `POST /api/ai/module-analyze/{vid}/{key}` — Claude Sonnet 4.5 analysis scoped to single module's data.
- **New frontend pages**: 
  - `/arac/:vehicleId` — Vehicle detail with 7 clickable module cards showing live counts/recurring badges.
  - `/arac/:vehicleId/modul/:moduleKey` — Module panel with issues list, repair history, color-coded severity, "AI ile Analiz Et" button, periodic maintenance schedule.
- **Recurring detection**: 2+ service records in last 6 months triggers warning banner with severity (yüksek if 3+).
- **Tests**: 27/28 new module tests pass + 26/26 regression. Fixed a Mongo `_id` leakage bug in module-analyze response.

## Backlog (P0 / P1 / P2)
- **P1**: Email notifications on appointment confirmation (Resend or SendGrid integration).
- **P1**: SMS reminders for upcoming appointments (Twilio).
- **P2**: PDF service-report download per service record.
- **P2**: File/photo uploads for damage reports (object storage).
- **P2**: Multi-language toggle (TR/EN).
- **P2**: Stripe-based online payment for completed services.

## Test Credentials
See `/app/memory/test_credentials.md`.
