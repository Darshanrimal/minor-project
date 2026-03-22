// src/index.js
require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const db        = require("./models/db");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("   NepalDaan — Blockchain Charity API v1.0");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
["JWT_SECRET","SOLANA_NETWORK"].forEach(v => {
  if (!process.env[v]) console.warn(`⚠️  Missing env var: ${v}`);
  else console.log(`✅ ${v}: ${v.includes("SECRET") ? "***" : process.env[v]}`);
});
const pinataOk = process.env.PINATA_API_KEY && !process.env.PINATA_API_KEY.startsWith("your_");
console.log(pinataOk ? "✅ PINATA: configured" : "ℹ️  PINATA: not configured (dummy CIDs)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      1000,
  message:  { error: "Too many requests, please try again later." },
  skip: (req) => req.path.includes('/donate') || req.path.includes('/donations'),
});


app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/organizations", require("./routes/organizations"));
app.use("/api/campaigns",     require("./routes/campaigns"));
app.use("/api/donations",     require("./routes/donations"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/ipfs",          require("./routes/ipfs"));
app.use("/api/admin",         require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status:  "ok",
    version: "1.0.0",
    network: process.env.SOLANA_NETWORK || "devnet",
    time:    new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 NepalDaan API  →  http://localhost:${PORT}`);
      console.log(`🌐 Network        →  ${process.env.SOLANA_NETWORK || "devnet"}`);
      console.log(`📋 Program ID     →  ${process.env.CHARITY_PROGRAM_ID || "(not set)"}\n`);
    });
  })
  .catch(err => {
    console.error("❌ DB init failed:", err.message);
    process.exit(1);
  });

module.exports = app;
