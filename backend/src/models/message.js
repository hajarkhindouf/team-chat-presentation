const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/connection');

const CHANNEL = 'General';

function createMessage({ authorName, authorAvatar, content }) {
  const db = getDb();
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO chat_messages (id, channel, author_name, author_avatar, content)
    VALUES (@id, @channel, @authorName, @authorAvatar, @content)
  `);
  stmt.run({
    id,
    channel: CHANNEL,
    authorName,
    authorAvatar: authorAvatar || null,
    content,
  });
  return getMessageById(id);
}

function getMessageById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
}

function listMessages({ limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM chat_messages
      WHERE channel = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(CHANNEL, limit, offset);

  const total = db
    .prepare('SELECT COUNT(*) AS count FROM chat_messages WHERE channel = ?')
    .get(CHANNEL).count;

  return { rows, total };
}

function deleteMessage(id, requesterName) {
  const db = getDb();
  const message = getMessageById(id);
  if (!message) return { status: 'not_found' };
  if (message.author_name !== requesterName) return { status: 'forbidden' };

  db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
  return { status: 'deleted' };
}

module.exports = {
  CHANNEL,
  createMessage,
  getMessageById,
  listMessages,
  deleteMessage,
};
