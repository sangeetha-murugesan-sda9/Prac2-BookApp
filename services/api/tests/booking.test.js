process.env.NODE_ENV = 'test';

require('dotenv').config();

const request = require('supertest');

// these tests need a real Supabase project (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL) with supabase/schema.sql
// already applied. they're skipped automatically if those aren't set,
// rather than failing CI on every machine that hasn't configured them.
const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeIfSupabase = hasSupabase ? describe : describe.skip;

const app = require('../server');

async function getToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'demo123' });
  return `Bearer ${res.body.token}`;
}

describe('health check (no db needed)', () => {
  it('responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('auth (no db needed)', () => {
  it('logs in with the demo account', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'demo', password: 'demo123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects the wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'demo', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describeIfSupabase('rooms + bookings (needs a real Supabase project)', () => {
  let roomId;

  // hardcoded dates here would mean every re-run of this suite collides
  // with rows the previous run left behind in the real database - the
  // overlap check would then correctly reject a "new" booking that's
  // actually colliding with old test data, not the thing we're testing.
  // spreading runs across different days (not just different customer
  // names) means even a failed cleanup from a previous run can't cause
  // a false collision here.
  const runId = Date.now();
  const anchor = new Date(Date.UTC(2031, 0, 1));
  anchor.setUTCDate(anchor.getUTCDate() + (runId % 1000));
  const day = anchor.toISOString().slice(0, 10);
  const bookingStart = `${day}T10:00:00Z`;
  const bookingMid = `${day}T10:30:00Z`;
  const bookingOverlapEnd = `${day}T11:30:00Z`;
  const bookingEnd = `${day}T11:00:00Z`;
  const backToBackEnd = `${day}T12:00:00Z`;

  afterAll(async () => {
    // tidy up so this run's rows don't become next run's collisions
    const { supabase } = require('../db');
    await supabase.from('bookings').delete().eq('room_id', roomId).in(
      'customer_name', [`test suite ${runId}`, `back to back ${runId}`]
    );
  });

  it('lists rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    roomId = res.body[0].id;
  });

  it('rejects booking creation with no token', async () => {
    const res = await request(app).post('/api/bookings').send({ room_id: roomId });
    expect(res.status).toBe(401);
  });

  it('creates a booking once logged in', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', token)
      .send({
        room_id: roomId,
        customer_name: `test suite ${runId}`,
        starts_at: bookingStart,
        ends_at: bookingEnd,
      });
    expect(res.status).toBe(201);
  });

  it('rejects an overlapping booking for the same room - the real business rule', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', token)
      .send({
        room_id: roomId,
        customer_name: `double booker ${runId}`,
        starts_at: bookingMid, // overlaps the booking above
        ends_at: bookingOverlapEnd,
      });
    expect(res.status).toBe(409);
  });

  it('allows a non-overlapping booking right after the first one ends', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', token)
      .send({
        room_id: roomId,
        customer_name: `back to back ${runId}`,
        starts_at: bookingEnd,
        ends_at: backToBackEnd,
      });
    expect(res.status).toBe(201);
  });
});
