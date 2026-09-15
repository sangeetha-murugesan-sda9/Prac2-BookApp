# room-booking-devsecops-demo

A small room-booking app - React frontend, an **api** service (Express +
Supabase/Postgres, handles auth and bookings), and a separate **audit**
service the api calls internally on every booking created or cancelled -
built to show off a DevSecOps CI pipeline for the DevOps course demo.

## Why this domain (not another CRUD app)

Booking systems have a real business rule to get right: two bookings for
the same room can't overlap. That rule is enforced **twice**, on purpose:

1. In the api (`services/api/routes/bookings.js`) - checks for a conflict
   before inserting, so a customer gets a clean "that slot is taken"
   error instead of a raw database error.
2. In the database itself (`supabase/schema.sql`) - a Postgres exclusion
   constraint makes an overlapping booking impossible to insert, full
   stop, even if two requests race past the app-level check at the exact
   same time, or if the app-level check has a bug.

That's a genuine defense-in-depth story, and a good "Design Decisions"
talking point: the app check is for UX, the db constraint is the real
guarantee.

## Architecture

```
React frontend --> api (Express, port 4000) --> audit (Express, port 5000)
                        |                             |
                   Supabase Postgres              audit.db (sqlite)
                   (rooms, bookings)
```

`audit` is not exposed publicly - in `docker-compose.yml` it has no host
port mapping, only `api` can reach it. The frontend's activity log view
goes through `api`'s `/api/audit-log` passthrough route.

## One-time setup: Supabase

1. Create a free project at https://supabase.com.
2. Project -> SQL Editor -> New query -> paste the contents of
   `supabase/schema.sql` -> Run. This creates the `rooms` and `bookings`
   tables, the overlap-prevention constraint, and seeds 3 rooms.
3. Project Settings -> API: copy the **Project URL** and the
   **service_role key** (not the anon key - the api needs full access).
4. Project Settings -> Database -> Connection string -> URI (either
   pooler mode works): copy this too.
5. `cd services/api && cp .env.example .env` and fill in all three
   values.

## Running it locally (without Docker)

Three terminals:

```
cd services/audit
npm install
npm run dev
```
Runs on http://localhost:5000

```
cd services/api
npm install
npm run dev
```
Runs on http://localhost:4000, reads `.env` for Supabase credentials.

```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173, proxies `/api` to the api service.

Demo login: **username `demo`, password `demo123`**. Anyone can view and
search bookings; you need to log in to actually book or cancel a room.

## Running it with Docker Compose

```
cp .env.example .env   # root-level, fill in the same Supabase values
docker-compose up --build
```

## Running tests

```
cd services/api && npm test
cd services/audit && npm test
```

The api's db-dependent tests (rooms, bookings, the overlap rule) are
skipped automatically if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
aren't set, rather than failing - so `npm test` still passes on a machine
that hasn't configured Supabase yet. To actually run them, either set
those two env vars locally, or add them as repo secrets so CI runs them
too (see `.github/workflows/ci.yml`).

