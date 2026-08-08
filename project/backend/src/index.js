require("dotenv").config();
const fs = require("fs");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./models/db");
const { TREASURY_FILE } = require("./services/solanaService");

function logStartupConfig() {
  console.log("\n============================================");
  console.log(" NepalDaan Blockchain Charity API");
  console.log("============================================");

  ["JWT_SECRET", "SOLANA_NETWORK", "SOLANA_RPC_URL"].forEach((key) => {
    if (!process.env[key]) {
      console.warn(`Missing env var: ${key}`);
      return;
    }
    console.log(`${key}: ${key.includes("SECRET") ? "***" : process.env[key]}`);
  });

  if (!process.env.TREASURY_PRIVATE_KEY) {
    console.warn("Missing env var: TREASURY_PRIVATE_KEY");
    console.warn(`Using treasury fallback file if present: ${TREASURY_FILE}`);
    console.warn("eSewa donations will auto-record on Solana when that wallet file exists and has devnet SOL.");
  }

  const pinataConfigured =
    process.env.PINATA_API_KEY &&
    !process.env.PINATA_API_KEY.startsWith("your_");
  console.log(pinataConfigured ? "PINATA: configured" : "PINATA: not configured (dummy CIDs)");
  console.log("============================================\n");
}

logStartupConfig();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.5:5173",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    // Allow both desktop localhost and the LAN dev URL so auth works on laptop and phone during local testing.
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.includes("/donate") || req.path.includes("/donations"),
});

app.use("/api/", limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/organizations", require("./routes/organizations"));
app.use("/api/campaigns", require("./routes/campaigns"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/users", require("./routes/users"));
app.use("/api/ipfs", require("./routes/ipfs"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    network: process.env.SOLANA_NETWORK || "devnet",
    treasury_configured: Boolean(process.env.TREASURY_PRIVATE_KEY || fs.existsSync(TREASURY_FILE)),
    time: new Date().toISOString(),
  });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

db.initDb()
  .then(() => {
    // Listen on all interfaces so phones on the same Wi-Fi can reach the API during local testing.
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`NepalDaan API -> http://localhost:${PORT}`);
      console.log(`NepalDaan API (LAN) -> http://192.168.1.5:${PORT}`);
      console.log(`Network -> ${process.env.SOLANA_NETWORK || "devnet"}`);
      console.log(`Program ID -> ${process.env.CHARITY_PROGRAM_ID || "(not set)"}\n`);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });

module.exports = app;


