process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const { migrate } = require('../../src/db/migrate');
const { closeDb } = require('../../src/db/connection');
const {
  createMessage,
  listMessages,
  deleteMessage,
  getMessageById,
} = require('../../src/models/message');

describe('message model (unit)', () => {
  beforeEach(() => {
    // Close any previous in-memory DB so each test starts from a clean slate
    closeDb();
    migrate();
  });

  afterAll(() => {
    closeDb();
  });

  test('createMessage persists a message and returns it', () => {
    const msg = createMessage({ authorName: 'Alice', content: 'Hello world' });

    expect(msg).toBeDefined();
    expect(msg.id).toBeTruthy();
    expect(msg.author_name).toBe('Alice');
    expect(msg.content).toBe('Hello world');
    expect(msg.channel).toBe('General');
    expect(msg.created_at).toBeTruthy();
  });

  test('getMessageById returns undefined for unknown id', () => {
    expect(getMessageById('does-not-exist')).toBeUndefined();
  });

  test('listMessages returns messages ordered by most recent first', () => {
    createMessage({ authorName: 'Alice', content: 'first' });
    createMessage({ authorName: 'Bob', content: 'second' });

    const { rows, total } = listMessages({ limit: 10, offset: 0 });

    expect(total).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0].content).toBe('second');
    expect(rows[1].content).toBe('first');
  });

  test('listMessages respects limit and offset (pagination)', () => {
    for (let i = 0; i < 5; i += 1) {
      createMessage({ authorName: 'Alice', content: `msg-${i}` });
    }

    const page1 = listMessages({ limit: 2, offset: 0 });
    const page2 = listMessages({ limit: 2, offset: 2 });

    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.rows[0].content).not.toBe(page2.rows[0].content);
  });

  test('deleteMessage removes the message when requester is the author', () => {
    const msg = createMessage({ authorName: 'Alice', content: 'to delete' });

    const result = deleteMessage(msg.id, 'Alice');

    expect(result.status).toBe('deleted');
    expect(getMessageById(msg.id)).toBeUndefined();
  });

  test('deleteMessage refuses when requester is not the author', () => {
    const msg = createMessage({ authorName: 'Alice', content: 'protected' });

    const result = deleteMessage(msg.id, 'Bob');

    expect(result.status).toBe('forbidden');
    expect(getMessageById(msg.id)).toBeDefined();
  });

  test('deleteMessage returns not_found for unknown id', () => {
    const result = deleteMessage('unknown-id', 'Alice');
    expect(result.status).toBe('not_found');
  });
});
