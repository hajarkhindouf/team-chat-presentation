const { getDb } = require('./connection');

/**
 * Creates the schema required by the MVP:
 *  - chat_messages : messages posted in the single "General" channel
 *  - polls / poll_options / poll_votes : bonus feature (create a poll)
 *
 * Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 */
function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      channel     TEXT NOT NULL DEFAULT 'General',
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
      ON chat_messages (created_at);

    CREATE TABLE IF NOT EXISTS polls (
      id          TEXT PRIMARY KEY,
      message_id  TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      question    TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id          TEXT PRIMARY KEY,
      poll_id     TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      label       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id          TEXT PRIMARY KEY,
      option_id   TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      voter_name  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(option_id, voter_name)
    );
  `);

  console.log('Migration completed: chat_messages, polls, poll_options, poll_votes ready.');
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
