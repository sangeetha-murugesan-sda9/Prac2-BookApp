const request = require('supertest');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'audit.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const app = require('../server');

describe('audit service', () => {
  it('health check works', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('audit');
  });

  it('records an event', async () => {
    const res = await request(app)
      .post('/events')
      .send({ action: 'create', note_id: 1, note_title: 'test note', actor: 'demo-user' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('rejects an event with no action', async () => {
    const res = await request(app).post('/events').send({ note_id: 1 });
    expect(res.status).toBe(400);
  });

  it('lists recorded events, most recent first', async () => {
    await request(app).post('/events').send({ action: 'delete', note_id: 2, actor: 'demo-user' });
    const res = await request(app).get('/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].action).toBe('delete');
  });
});
