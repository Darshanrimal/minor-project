// src/models/seed.js
require("dotenv").config();
const db     = require("./db");
const bcrypt = require("bcryptjs");
const fs     = require("fs");
const path   = require("path");

const DB_PATH = path.resolve(__dirname, "../../charity.db");

async function seed() {
  // ── Delete old database so there are no duplicate errors ──────────────────
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("🗑️  Old database deleted");
  }

  await db.initDb();
  console.log("\n🌱 Seeding NepalDaan database…\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash  = await bcrypt.hash("admin123", 10);
  const orgHash    = await bcrypt.hash("org123",   10);
  const donorHash  = await bcrypt.hash("donor123", 10);

  const [uAdmin] = await db.query(
    "INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)",
    ["admin", "admin@nepaldaan.com", adminHash, "admin"]
  );
  console.log("✅ Admin user id:", uAdmin.insertId);

  const [uOrg] = await db.query(
    "INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)",
    ["helpnepal", "org@helpnepal.com", orgHash, "org_admin"]
  );
  console.log("✅ OrgAdmin user id:", uOrg.insertId);

  const [uDonor] = await db.query(
    "INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)",
    ["ramesh", "ramesh@gmail.com", donorHash, "donor"]
  );
  console.log("✅ Donor user id:", uDonor.insertId);

  // ── Organization ───────────────────────────────────────────────────────────
  const [org] = await db.query(
    `INSERT INTO organizations
       (user_id, name, description, district, province, contact_email,
        contact_phone, registration_number, verification_status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      uOrg.insertId,
      "Help Nepal Foundation",
      "We build schools, clinics, and community centers in Nepal's most remote districts. Every project is verified, milestone-based, and fully transparent.",
      "Kathmandu", "Bagmati", "info@helpnepal.com",
      "+977-1-4XXXXXX", "SWC-2021-0042", "verified",
    ]
  );
  console.log("✅ Organization id:", org.insertId);

  // ── Campaign 1 ─────────────────────────────────────────────────────────────
  const [c1] = await db.query(
    `INSERT INTO campaigns
       (organization_id, title, description, category, goal_amount,
        start_date, end_date, province, district, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      org.insertId,
      "Build 3 Schools in Karnali Province",
      "Remote villages in Karnali Province have no primary schools. Children travel 4-6 hours on foot. We will build 3 fully equipped primary schools serving over 600 children.",
      "education", 50.0, "2026-01-01", "2026-12-31", "Karnali", "Jumla", 1,
    ]
  );
  console.log("✅ Campaign 1 id:", c1.insertId);

  // ── Campaign 2 ─────────────────────────────────────────────────────────────
  const [c2] = await db.query(
    `INSERT INTO campaigns
       (organization_id, title, description, category, goal_amount,
        start_date, end_date, province, district, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      org.insertId,
      "Mobile Health Clinics — Dolpa District",
      "Dolpa District has 36,000 people with only 1 health post. We are deploying 3 mobile health clinics staffed by licensed doctors making monthly circuits through 18 villages.",
      "health", 30.0, "2026-02-01", "2026-10-31", "Karnali", "Dolpa", 1,
    ]
  );
  console.log("✅ Campaign 2 id:", c2.insertId);

  // ── Campaign 3 ─────────────────────────────────────────────────────────────
  const [c3] = await db.query(
    `INSERT INTO campaigns
       (organization_id, title, description, category, goal_amount,
        start_date, end_date, province, district, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      org.insertId,
      "Earthquake Relief — Jajarkot Families",
      "Following seismic activity in Jajarkot, over 2,000 families are displaced. We provide emergency shelter kits, food packages, warm clothing, and psychosocial support.",
      "disaster_relief", 20.0, "2026-01-15", "2026-06-30", "Karnali", "Jajarkot", 1,
    ]
  );
  console.log("✅ Campaign 3 id:", c3.insertId);

  // ── Milestones for Campaign 1 ──────────────────────────────────────────────
  for (const [idx, title, desc, pct] of [
    [0, "Site Selection & Land Rights",   "Secure land agreements with all 3 village committees.", 33],
    [1, "Construction & Infrastructure",  "Build school buildings, install water systems & solar.", 34],
    [2, "Furnish, Staff & Grand Opening", "Equip classrooms, hire teachers, enroll first 200 students.", 33],
  ]) {
    await db.query(
      "INSERT INTO milestones (campaign_id,milestone_index,title,description,percentage) VALUES (?,?,?,?,?)",
      [c1.insertId, idx, title, desc, pct]
    );
  }
  console.log("✅ Milestones for campaign 1");

  // ── Milestones for Campaign 2 ──────────────────────────────────────────────
  for (const [idx, title, desc, pct] of [
    [0, "Equipment Procurement",       "Purchase diagnostic kits, medicines, vehicle outfitting.", 40],
    [1, "First Circuit Complete",      "Complete 18-village health circuit with 1000+ patients.", 35],
    [2, "Programme Continuation Fund", "Fund next 6 months of operations and staff salaries.", 25],
  ]) {
    await db.query(
      "INSERT INTO milestones (campaign_id,milestone_index,title,description,percentage) VALUES (?,?,?,?,?)",
      [c2.insertId, idx, title, desc, pct]
    );
  }
  console.log("✅ Milestones for campaign 2");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   ✅ Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nDemo accounts:");
  console.log("  Admin:    admin@nepaldaan.com  / admin123");
  console.log("  OrgAdmin: org@helpnepal.com    / org123");
  console.log("  Donor:    ramesh@gmail.com     / donor123");
  console.log("\nRun the backend: npm run dev");
  console.log("Run the frontend: cd ../frontend && npm run dev\n");
}

seed().then(() => process.exit(0)).catch(e => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
