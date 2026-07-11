const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Returns a (cached) SQLite connection.
 * DB_PATH env var lets tests / docker point to different files (or :memory:).
 */
let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'chat.sqlite');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = { getDb, closeDb };
