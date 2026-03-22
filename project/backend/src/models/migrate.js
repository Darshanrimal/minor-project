// src/models/migrate.js — standalone migration (schema is also auto-run in db.js)
// Run: node src/models/migrate.js
require("dotenv").config();
const db = require("./db");

db.initDb()
  .then(() => {
    console.log("✅ Migration complete — all tables created.");
    console.log("   Run 'node src/models/seed.js' to add demo data.\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  });
