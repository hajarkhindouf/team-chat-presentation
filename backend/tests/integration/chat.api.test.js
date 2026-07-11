process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { migrate } = require('../../src/db/migrate');
const { closeDb } = require('../../src/db/connection');

describe('Chat API (integration)', () => {
  let app;

  beforeEach(() => {
    closeDb();
    migrate();
    app = createApp();
  });

  afterAll(() => {
    closeDb();
  });

  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('POST /api/chat/messages creates a message', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .send({ authorName: 'Alice', content: 'Hello Team3' });

    expect(res.status).toBe(201);
    expect(res.body.data.author_name).toBe('Alice');
    expect(res.body.data.content).toBe('Hello Team3');
    expect(res.body.data.author_avatar).toContain('ui-avatars.com');
  });

  test('POST /api/chat/messages rejects missing content', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .send({ authorName: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/);
  });

  test('GET /api/chat/messages lists messages with pagination metadata', async () => {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/chat/messages')
        .send({ authorName: 'Alice', content: `message ${i}` });
    }

    const res = await request(app).get('/api/chat/messages?limit=2&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ limit: 2, offset: 0, total: 3, hasMore: true });
  });

  test('DELETE /api/chat/messages/:id removes own message', async () => {
    const created = await request(app)
      .post('/api/chat/messages')
      .send({ authorName: 'Alice', content: 'delete me' });

    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/chat/messages/${id}`)
      .send({ authorName: 'Alice' });

    expect(res.status).toBe(204);

    const list = await request(app).get('/api/chat/messages');
    expect(list.body.data.find((m) => m.id === id)).toBeUndefined();
  });

  test('DELETE /api/chat/messages/:id forbids deleting someone else message', async () => {
    const created = await request(app)
      .post('/api/chat/messages')
      .send({ authorName: 'Alice', content: 'protected' });

    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/chat/messages/${id}`)
      .send({ authorName: 'Bob' });

    expect(res.status).toBe(403);
  });

  test('POST /api/chat/polls creates a poll with options', async () => {
    const res = await request(app)
      .post('/api/chat/polls')
      .send({
        authorName: 'Alice',
        question: 'Pizza or Sushi?',
        options: ['Pizza', 'Sushi'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.options).toHaveLength(2);
  });

  test('POST /api/chat/polls rejects fewer than 2 options', async () => {
    const res = await request(app)
      .post('/api/chat/polls')
      .send({ authorName: 'Alice', question: 'Solo?', options: ['Only one'] });

    expect(res.status).toBe(400);
  });
});
