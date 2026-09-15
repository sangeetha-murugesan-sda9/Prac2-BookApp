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

**Not verified end-to-end in the environment this repo was assembled in**
(no network access to Supabase or a local Docker daemon there). The
Dockerfiles follow a standard, simple pattern and the api's tests pass
locally, but you need to run `docker-compose up --build` yourself, with
your own Supabase project configured, well before the demo - don't find
out live whether it works.

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

## What's deliberately broken here

Three things, across three different vulnerability *classes* - the real
point of the demo is that one static analysis tool catches different
kinds of mistakes:

1. **SQL injection** (injection flaw) - `services/api/routes/bookings.js`,
   the `/api/bookings/search` route. Almost everything in this app goes
   through the `@supabase/supabase-js` client, which parameterizes every
   query - there's no way to inject through it. This one route bypasses
   that and uses a **raw `pg` connection** with string concatenation
   instead, because someone needed a "quick custom query" the
   supabase-js query builder couldn't express easily. That's a realistic
   way injection bugs actually get introduced - not from not knowing
   better, but from working around the safe path for one edge case.
   CodeQL's `js/sql-injection` query should flag it.

2. **Outdated dependency** (dependency-management flaw) - `lodash` is
   pinned to `4.17.15` in `services/api/package.json`, a known
   prototype-pollution CVE. Dependabot should open a PR for this.

3. **Hardcoded JWT secret** (secrets-management flaw) -
   `services/api/config.js`. CodeQL's `js/hardcoded-credentials` query
   should flag this.

Don't "fix" these before the demo, that's the whole point.

## GitHub setup checklist (do this once, before class)

- [ ] Push repo to GitHub (public, so Copilot Autofix is free)
- [ ] Settings -> Secrets and variables -> Actions: add `SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` if you want CI to run
      the db-dependent tests
- [ ] Settings -> Code security -> enable **CodeQL** (default setup)
- [ ] Settings -> Code security -> enable **Dependabot alerts** +
      **Dependabot security updates**
- [ ] Settings -> Branches -> protection rule on `main`: require CI checks
      + CodeQL before merge - this is the "security gate"
- [ ] Commit `package-lock.json` for `services/api`, `services/audit`, and
      `frontend`
- [ ] **Never commit `.env`** - it's gitignored, but double check before
      your first push

## Demo timing plan (target: ~7 min, hard limit 6:30-7:30)

- 0:00-1:00 - the problem (manual vuln triage doesn't scale)
- 1:00-2:00 - architecture walkthrough (frontend / api / audit, and the
  double-booking rule enforced at both the app and db level)
- 2:00-3:30 - open the PR, show CodeQL / Dependabot picking it up
- 3:30-4:30 - show the autofix PR
- 4:30-5:30 - tests + build + docker validating the fix
- 5:30-6:30 - branch protection gate passing, merge
- 6:30-7:00 - wrap up: mention the limitation (autofix isn't guaranteed
  for every alert type, this doesn't replace manual review for logic bugs
  or auth design)
