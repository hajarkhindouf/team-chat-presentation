process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const http = require('http');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { migrate } = require('../../src/db/migrate');
const { closeDb } = require('../../src/db/connection');

describe('Chat E2E scenario', () => {
  let server;

  beforeAll((done) => {
    closeDb();
    migrate();
    const app = createApp();
    server = http.createServer(app);
    server.listen(done);
  });

  afterAll((done) => {
    closeDb();
    server.close(done);
  });

  test('full user journey: join, chat, poll, refresh, delete', async () => {
    // 1. App boots and health check passes
    const health = await request(server).get('/api/health');
    expect(health.status).toBe(200);

    // 2. Alice opens the "General" channel and sees no history yet
    const empty = await request(server).get('/api/chat/messages');
    expect(empty.body.data).toHaveLength(0);

    // 3. Alice sends a message
    const aliceMsg = await request(server)
      .post('/api/chat/messages')
      .send({ authorName: 'Alice', content: 'Salut tout le monde !' });
    expect(aliceMsg.status).toBe(201);

    // 4. Bob joins later and sends a message too
    const bobMsg = await request(server)
      .post('/api/chat/messages')
      .send({ authorName: 'Bob', content: 'Salut Alice !' });
    expect(bobMsg.status).toBe(201);

    // 5. Bob refreshes and sees both messages, most recent first, with author info
    const history = await request(server).get('/api/chat/messages?limit=50&offset=0');
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0].author_name).toBe('Bob');
    expect(history.body.data[1].author_name).toBe('Alice');
    expect(history.body.data[0].author_avatar).toBeTruthy();
    expect(history.body.data[0].created_at).toBeTruthy();

    // 6. Alice creates a poll to decide lunch
    const poll = await request(server)
      .post('/api/chat/polls')
      .send({ authorName: 'Alice', question: 'Lunch?', options: ['Pizza', 'Sushi', 'Salad'] });
    expect(poll.status).toBe(201);
    const pollId = poll.body.data.id;
    const pizzaOptionId = poll.body.data.options[0].id;

    // 7. Bob votes on the poll
    const vote = await request(server)
      .post(`/api/chat/polls/${pollId}/vote`)
      .send({ optionId: pizzaOptionId, voterName: 'Bob' });
    expect(vote.status).toBe(201);

    // 8. Bob tries to vote twice for the same option -> rejected
    const doubleVote = await request(server)
      .post(`/api/chat/polls/${pollId}/vote`)
      .send({ optionId: pizzaOptionId, voterName: 'Bob' });
    expect(doubleVote.status).toBe(409);

    // 9. Poll results reflect the vote and the poll now appears in the timeline
    const results = await request(server).get(`/api/chat/polls/${pollId}`);
    expect(results.body.data.options.find((o) => o.id === pizzaOptionId).votes).toBe(1);

    const historyWithPoll = await request(server).get('/api/chat/messages');
    expect(historyWithPoll.body.data).toHaveLength(3);

    // 10. Bob deletes his own message
    const del = await request(server)
      .delete(`/api/chat/messages/${bobMsg.body.data.id}`)
      .send({ authorName: 'Bob' });
    expect(del.status).toBe(204);

    // 11. Alice cannot delete Bob's poll message (not the author would be Bob, so Alice IS author -> allowed)
    // sanity: Alice deletes her own poll-origin message
    const delPoll = await request(server)
      .delete(`/api/chat/messages/${poll.body.data.messageId}`)
      .send({ authorName: 'Alice' });
    expect(delPoll.status).toBe(204);

    // 12. Final state: only Alice's first greeting remains
    const finalHistory = await request(server).get('/api/chat/messages');
    expect(finalHistory.body.data).toHaveLength(1);
    expect(finalHistory.body.data[0].content).toBe('Salut tout le monde !');
  });
});
