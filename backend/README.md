# QR Event Platform Backend

Express.js backend service with Prisma ORM and Supabase authentication.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend folder with the following variables:
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Push schema to database:
```bash
npm run prisma:push
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/qr/:token` - Get user by QR token
- `PATCH /api/users/:id` - Update user
- `GET /api/users/:id/events` - Get user's events

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/qr/:token` - Get event by QR token
- `GET /api/events/:id/signups` - Get event signups

### Signups
- `POST /api/signups` - Sign up for event
- `POST /api/signups/caregiver` - Caregiver signs up student
- `DELETE /api/signups/:id` - Cancel signup
