# MIINDS Connect

QR-first event sign-ups for individuals with special needs, caregivers, and staff.

MIINDS Singapore empowers individuals with special needs and their families. MIINDS Connect reduces friction in activity sign-ups, cuts staff consolidation time, and keeps sensitive data protected.

## Problem Statement
How might we reduce friction in activity sign-ups for both individuals and caregivers, while reducing manual effort for staff in managing and consolidating registration data?

## Solution Overview
Two interfaces powered by QR codes:
- Individuals: scan an event QR, confirm in one step, view a calendar + their sign-ups.
- Caregivers: scan a student QR, sign in to confirm, approve or waitlist on behalf of the student.
- Staff: create events, set capacity + approvals, manage waitlists, and track attendance.

## Key Features
- QR-first sign-up flow (event QR + student QR).
- Role-based access control (student, caregiver, staff).
- Capacity limits, approval queues, and waitlists.
- Attendance tracking with a dedicated check-in QR.
- Caregiver-student consent links with audit-friendly records.
- Data masking for sensitive fields in caregiver views.

## Tech Stack
- Frontend: Next.js (React, Tailwind)
- Backend: Express + Prisma
- Auth/DB: Supabase (PostgreSQL)

## Data Model (Core)
- `users`: student, caregiver, staff accounts + QR token
- `student_profiles`: gender, ID, NOK details, disability type, support needs
- `caregiver_profiles`: role type, organization, contact
- `caregiver_students`: caregiver-student links + consent timestamp
- `events`: capacity, approval rules, waitlist, QR + check-in QR
- `event_signups`: status lifecycle (pending/approved/waitlisted/checked-in)

## Quick Start

Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Environment Variables
Frontend (`.env.local`):
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Backend (`backend/.env`):
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
QR_SIGNING_SECRET="long-random-string"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

## Demo Script (3 minutes)
1. Student logs in and scans event QR to auto-fill and confirm.
2. Caregiver signs in, scans student QR, approves a different event.
3. Staff views roster: capacity, waitlist, approvals, and checks-in attendees.

## Security & Privacy
- Signed QR tokens with expiry (optional on generation).
- RLS-ready data model + backend-only service role for trusted operations.
- Consent-based caregiver access to student records.
- Masked ID + NOK contact for unlinked caregivers.
- Reference RLS policies in `backend/supabase/rls.sql`.

## API Overview
See `backend/README.md` for endpoint details and request bodies.

## Future Enhancements
- WhatsApp/SMS reminders for waitlist promotions.
- Offline capture with sync for on-site sign-ups.
- Multi-language mode and text-to-speech guidance.
