# MINDS Connect Backend

Express.js API with Prisma ORM and Supabase Auth for QR-first event sign-ups.

Roles: `STUDENT`, `CAREGIVER`, `STAFF`.

## Setup
```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Environment Variables
Create `backend/.env`:
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

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user (student/caregiver/staff) + optional profile data
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/:id` - Get user by ID (role/consent aware)
- `GET /api/users/qr/:token` - Get student by QR token (caregiver/staff only)
- `PATCH /api/users/:id` - Update profile (student/caregiver fields)
- `GET /api/users/:id/events` - Get user's events
- `GET /api/users/my-students` - Get caregiver-linked students
- `POST /api/users/assign-student` - Link caregiver to student with consent
- `POST /api/users/regenerate-qr` - Regenerate user QR token

### Events
- `GET /api/events` - List events (filters + pagination)
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/qr/:token` - Get event by QR token
- `POST /api/events` - Create event (staff/caregiver)
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/:id/signups` - Event roster + signup statuses
- `POST /api/events/:id/regenerate-qr` - Regenerate event signup QR
- `POST /api/events/:id/regenerate-checkin-qr` - Regenerate event check-in QR

### Signups
- `POST /api/signups` - Self sign-up
- `POST /api/signups/qr/:token` - Quick sign-up via event QR
- `POST /api/signups/caregiver` - Caregiver sign-up for student
- `POST /api/signups/bulk` - Bulk sign-up
- `GET /api/signups/my` - My signups
- `GET /api/signups/:id` - Get signup detail
- `DELETE /api/signups/:id` - Cancel signup (moves to cancelled)
- `POST /api/signups/:id/approve` - Approve signup
- `POST /api/signups/:id/decline` - Decline signup
- `POST /api/signups/:id/check-in` - Check-in attendee
- `POST /api/signups/check-in/qr/:token` - Self check-in via check-in QR

## QR Tokens
QR tokens can be used as raw UUIDs or signed tokens (HMAC + expiry). The API accepts both via `normalizeQrToken`.

## Security Notes
- Role-based access controls in middleware
- Caregiver-student consent links gate access to student profiles
- Masked sensitive fields for unlinked caregivers
- See `backend/supabase/rls.sql` for suggested RLS policies
