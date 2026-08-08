// src/models/db.js
const initSqlJs = require("sql.js");
const path      = require("path");
const fs        = require("fs");
const { convertNprToSol } = require("../services/esewaService");

const DB_PATH = path.resolve(__dirname, "../../charity.db");
let db            = null;
let inTransaction = false;

function saveDb() {
  if (!db || inTransaction) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() {
  if (db) return db;
  throw new Error("Database not initialized. Call initDb() first.");
}

function readLastInsertId() {
  const stmt = db.prepare("SELECT last_insert_rowid() AS id");
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return typeof row.id === "number" ? row.id : 0;
}

function normalizeLegacyDonationData() {
  // Repair legacy SOL rows that predate blockchain_ref storage by copying the transaction signature across.
  db.run(`
    UPDATE donations
    SET blockchain_ref = tx_signature
    WHERE payment_method = 'sol'
      AND tx_signature IS NOT NULL
      AND tx_signature <> ''
      AND (blockchain_ref IS NULL OR blockchain_ref = '')
  `);

  const stmt = db.prepare(`
    SELECT id, amount_npr, amount_sol, tx_signature, esewa_ref_id
    FROM donations
    WHERE payment_method = 'esewa'
  `);

  while (stmt.step()) {
    const row = stmt.getAsObject();
    const amountNpr = typeof row.amount_npr === "number" ? row.amount_npr : parseFloat(row.amount_npr);
    const amountSol = typeof row.amount_sol === "number" ? row.amount_sol : parseFloat(row.amount_sol);
    const derivedRef =
      row.esewa_ref_id ||
      (typeof row.tx_signature === "string" && row.tx_signature.startsWith("campaign-")
        ? row.tx_signature
        : typeof row.tx_signature === "string" && row.tx_signature.startsWith("ESEWA-")
          ? row.tx_signature.replace(/^ESEWA-/, "")
          : null);

    if (derivedRef && derivedRef !== row.esewa_ref_id) {
      db.run("UPDATE donations SET esewa_ref_id = ? WHERE id = ?", [derivedRef, row.id]);
    }

    if (Number.isFinite(amountNpr) && amountNpr > 0 && (!Number.isFinite(amountSol) || amountSol <= 0)) {
      const repairedSol = convertNprToSol(amountNpr);
      if (repairedSol) {
        db.run("UPDATE donations SET amount_sol = ? WHERE id = ?", [repairedSol, row.id]);
      }
    }
  }

  stmt.free();

  // Remove broken placeholder eSewa rows that were stored without any actual amount.
  db.run(`
    DELETE FROM donations
    WHERE payment_method = 'esewa'
      AND (amount_npr IS NULL OR amount_npr <= 0)
      AND (amount_sol IS NULL OR amount_sol <= 0)
  `);

  // Recompute campaign progress from the repaired donation ledger so raised_amount stays trustworthy.
  db.run(`
    UPDATE campaigns
    SET raised_amount = COALESCE((
      SELECT ROUND(SUM(COALESCE(d.amount_sol, 0)), 9)
      FROM donations d
      WHERE d.campaign_id = campaigns.id
    ), 0)
  `);
}

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
      goal_amount_npr  REAL,
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
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id    INTEGER NOT NULL REFERENCES campaigns(id),
      user_id        INTEGER REFERENCES users(id),
      donor_wallet   TEXT NOT NULL DEFAULT 'esewa',
      amount_sol     REAL NOT NULL DEFAULT 0,
      amount_npr     REAL,
      tx_signature   TEXT NOT NULL UNIQUE,
      blockchain_ref TEXT,
      esewa_ref_id   TEXT,
      message        TEXT,
      payment_method TEXT NOT NULL DEFAULT 'sol'
                     CHECK(payment_method IN ('sol','esewa')),
      created_at     TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safe migrations for existing databases
  const migrations = [
    "ALTER TABLE donations ADD COLUMN payment_method TEXT DEFAULT 'sol'",
    "ALTER TABLE donations ADD COLUMN amount_npr REAL",
    "ALTER TABLE donations ADD COLUMN blockchain_ref TEXT",
    "ALTER TABLE donations ADD COLUMN esewa_ref_id TEXT",
    "ALTER TABLE campaigns ADD COLUMN goal_amount_npr REAL",
  ];
  for (const sql of migrations) {
    try { db.run(sql); } catch (_) { /* column already exists — safe to ignore */ }
  }

  normalizeLegacyDonationData();
  saveDb();
}

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

function execQuery(sql, params = []) {
  const database = getDb();
  const trimmed  = sql.trim().toUpperCase();

  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH") || trimmed.startsWith("PRAGMA")) {
    const stmt = database.prepare(sql);
    const rows = [];
    if (params.length > 0) stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return [rows, {}];
  }

  const stmt = database.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  stmt.step();
  stmt.free();
  const insertId     = readLastInsertId();
  const affectedRows = database.getRowsModified();
  if (!inTransaction) saveDb();
  return [{ affectedRows, insertId }, {}];
}

function query(sql, params = []) {
  return Promise.resolve(execQuery(sql, params));
}

function queryIn(sql, arrayParam) {
  if (!Array.isArray(arrayParam) || arrayParam.length === 0) {
    return Promise.resolve([[], {}]);
  }
  const placeholders = arrayParam.map(() => "?").join(",");
  const expanded     = sql.replace("IN (?)", `IN (${placeholders})`);
  return query(expanded, arrayParam);
}

function getConnection() {
  const conn = {
    query: (sql, params = []) => Promise.resolve(execQuery(sql, params)),
    beginTransaction: () => {
      inTransaction = true;
      execQuery("BEGIN");
      return Promise.resolve();
    },
    commit: () => {
      execQuery("COMMIT");
      inTransaction = false;
      saveDb();
      return Promise.resolve();
    },
    rollback: () => {
      try { execQuery("ROLLBACK"); } catch (_) {}
      inTransaction = false;
      return Promise.resolve();
    },
    release: () => Promise.resolve(),
  };
  return Promise.resolve(conn);
}

module.exports = { initDb, query, queryIn, getConnection };
