// src/models/db.js
// Pure-JS SQLite via sql.js — no native compilation required.
//
// Two critical bugs fixed vs naive implementations:
// 1. last_insert_rowid() must be read BEFORE db.export() (saveDb resets it to 0)
// 2. saveDb() must NOT be called inside an open transaction — db.export()
//    commits the transaction implicitly, making the explicit COMMIT fail.

const initSqlJs = require("sql.js");
const path      = require("path");
const fs        = require("fs");

const DB_PATH = path.resolve(__dirname, "../../charity.db");
let db             = null;
let inTransaction  = false; // global flag — sql.js has one connection

// ── Internal helpers ─────────────────────────────────────────────────────────

function saveDb() {
  if (!db) return;
  if (inTransaction) return; // NEVER save mid-transaction (breaks COMMIT)
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() {
  if (db) return db;
  throw new Error("Database not initialized. Call initDb() first.");
}

function readLastInsertId() {
  // Must be called BEFORE saveDb() — export() resets last_insert_rowid to 0
  const stmt = db.prepare("SELECT last_insert_rowid() AS id");
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return typeof row.id === "number" ? row.id : 0;
}

// ── Schema ───────────────────────────────────────────────────────────────────

function runSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      username       TEXT NOT NULL UNIQUE,
      email          TEXT NOT NULL UNIQUE,
      password       TEXT NOT NULL,
      role           TEXT NOT NULL DEFAULT 'donor'
                     CHECK(role IN ('donor','org_admin','admin')),
      wallet_address TEXT UNIQUE,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL REFERENCES users(id),
      name                TEXT NOT NULL,
      description         TEXT,
      website             TEXT,
      district            TEXT,
      province            TEXT,
      contact_email       TEXT NOT NULL,
      contact_phone       TEXT,
      registration_number TEXT,
      docs_cid            TEXT,
      verification_status TEXT NOT NULL DEFAULT 'pending'
                          CHECK(verification_status IN ('pending','verified','rejected')),
      rejection_reason    TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id  INTEGER NOT NULL REFERENCES organizations(id),
      title            TEXT NOT NULL,
      description      TEXT,
      category         TEXT NOT NULL DEFAULT 'other',
      goal_amount      REAL NOT NULL,
      raised_amount    REAL NOT NULL DEFAULT 0,
      start_date       TEXT,
      end_date         TEXT,
      district         TEXT,
      province         TEXT,
      image_cid        TEXT,
      on_chain_address TEXT,
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id     INTEGER NOT NULL REFERENCES campaigns(id),
      milestone_index INTEGER NOT NULL,
      title           TEXT NOT NULL,
      description     TEXT,
      percentage      REAL NOT NULL,
      target_date     TEXT,
      is_released     INTEGER NOT NULL DEFAULT 0,
      evidence_cid    TEXT,
      tx_signature    TEXT,
      released_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS donations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id  INTEGER NOT NULL REFERENCES campaigns(id),
      user_id      INTEGER REFERENCES users(id),
      donor_wallet TEXT NOT NULL,
      amount_sol   REAL NOT NULL,
      tx_signature TEXT NOT NULL UNIQUE,
      message      TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);
  saveDb();
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  console.log("💾 SQLite database:", DB_PATH);
  runSchema();
  return db;
}

// ── Core executor ─────────────────────────────────────────────────────────────

function execQuery(sql, params = []) {
  const database = getDb();
  const trimmed  = sql.trim().toUpperCase();

  // SELECT
  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH")) {
    const stmt = database.prepare(sql);
    const rows = [];
    if (params.length > 0) stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return [rows];
  }

  // INSERT / UPDATE / DELETE
  database.run(sql, params);
  const affectedRows = database.getRowsModified();

  if (trimmed.startsWith("INSERT")) {
    const insertId = readLastInsertId(); // BEFORE saveDb
    saveDb();                            // skipped if inTransaction
    return [{ insertId, affectedRows }];
  }

  saveDb();
  return [{ affectedRows }];
}

// ── Public API ────────────────────────────────────────────────────────────────

const dbWrapper = {
  // Async wrapper (routes use await db.query(...))
  query: async (sql, params = []) => {
    try {
      return execQuery(sql, params);
    } catch (err) {
      console.error("DB Error:", err.message, "\nSQL:", sql);
      throw err;
    }
  },

  // IN-clause expansion: db.queryIn('WHERE id IN (?)', [1,2,3])
  queryIn: async (sql, arrayParam, extraParams = []) => {
    if (!arrayParam || arrayParam.length === 0) return [[]];
    const placeholders = arrayParam.map(() => "?").join(",");
    const expandedSql  = sql.replace("IN (?)", `IN (${placeholders})`);
    try {
      const database = getDb();
      const stmt     = database.prepare(expandedSql);
      const rows     = [];
      stmt.bind([...arrayParam, ...extraParams]);
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return [rows];
    } catch (err) {
      console.error("DB queryIn Error:", err.message, "\nSQL:", expandedSql);
      throw err;
    }
  },

  // Transaction connection — mimics mysql2 pool.getConnection()
  getConnection: async () => ({
    query: async (sql, params = []) => {
      try {
        return execQuery(sql, params); // saveDb skipped while inTransaction=true
      } catch (err) {
        console.error("DB Conn Error:", err.message, "\nSQL:", sql);
        throw err;
      }
    },

    beginTransaction: async () => {
      getDb().run("BEGIN");
      inTransaction = true;
    },

    commit: async () => {
      getDb().run("COMMIT");
      inTransaction = false;
      saveDb(); // save once, after commit
    },

    rollback: async () => {
      try { getDb().run("ROLLBACK"); } catch (_) {}
      inTransaction = false;
      // no saveDb on rollback — changes discarded
    },

    release: () => {}, // no-op (single sql.js connection)
  }),

  initDb,
};

module.exports = dbWrapper;
