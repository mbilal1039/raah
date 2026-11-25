const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const db = new Database(path.join(__dirname, "..", process.env.DB_FILE || "raah.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','professional','company')),
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS interests (
  user_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (user_id, tag),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS openings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS advice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  profession_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

module.exports = db;