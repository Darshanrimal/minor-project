// src/routes/admin.js
const express = require("express");
const router  = express.Router();
const db      = require("../models/db");
const auth    = require("../middleware/auth");

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });
  next();
}

// GET /api/admin/stats
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role='donor') AS total_donors,
        (SELECT COUNT(*) FROM users WHERE role='org_admin') AS total_org_admins,
        (SELECT COUNT(*) FROM organizations) AS total_organizations,
        (SELECT COUNT(*) FROM organizations WHERE verification_status='pending') AS pending_orgs,
        (SELECT COUNT(*) FROM organizations WHERE verification_status='verified') AS verified_orgs,
        (SELECT COUNT(*) FROM campaigns) AS total_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE is_active=1) AS active_campaigns,
        (SELECT COUNT(*) FROM donations) AS total_donations,
        (SELECT COALESCE(SUM(amount_sol),0) FROM donations) AS total_sol_raised,
        (SELECT COALESCE(AVG(amount_sol),0) FROM donations) AS avg_donation
    `);
    // Recent donations for activity feed
    const [recent] = await db.query(`
      SELECT d.donor_wallet, d.amount_sol, d.created_at,
             c.title AS campaign_title
      FROM donations d
      JOIN campaigns c ON d.campaign_id = c.id
      ORDER BY d.created_at DESC LIMIT 5
    `);
    // Monthly donations trend (last 6 months)
    const [trend] = await db.query(`
      SELECT strftime('%Y-%m', created_at) AS month,
             COUNT(*) AS count,
             ROUND(SUM(amount_sol),4) AS total_sol
      FROM donations
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC LIMIT 6
    `);
    res.json({ ...stats, recent_activity: recent, trend: trend.reverse() });
  } catch (err) {
    console.error("admin stats error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/users
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.email, u.role, u.wallet_address, u.created_at,
             COUNT(d.id) AS donation_count,
             COALESCE(SUM(d.amount_sol),0) AS total_donated
      FROM users u
      LEFT JOIN donations d ON d.user_id = u.id
      GROUP BY u.id, u.username, u.email, u.role, u.wallet_address, u.created_at
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("admin users error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", auth, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  const { role } = req.body;
  if (!["donor","org_admin","admin"].includes(role))
    return res.status(400).json({ message: "Invalid role" });
  try {
    await db.query("UPDATE users SET role=? WHERE id=?", [role, id]);
    res.json({ message: "Role updated", id, role });
  } catch (err) {
    console.error("admin role error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/organizations
router.get("/organizations", auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, u.username, u.email AS user_email,
             COUNT(c.id) AS campaign_count,
             COALESCE(SUM(c.raised_amount),0) AS total_raised
      FROM organizations o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN campaigns c ON c.organization_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("admin orgs error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/organizations/:id/verify
router.patch("/organizations/:id/verify", auth, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  const { verification_status, rejection_reason } = req.body;
  if (!["verified","rejected","pending"].includes(verification_status))
    return res.status(400).json({ message: "Invalid status" });
  try {
    await db.query(
      "UPDATE organizations SET verification_status=?, rejection_reason=? WHERE id=?",
      [verification_status, rejection_reason || null, id]
    );
    res.json({ message: "Status updated", id, verification_status });
  } catch (err) {
    console.error("admin verify org error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/campaigns
router.get("/campaigns", auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.organization_id, c.title, c.description, c.category,
             c.goal_amount, c.raised_amount, c.start_date, c.end_date,
             c.district, c.province, c.image_cid, c.on_chain_address,
             c.is_active, c.created_at, o.name AS organization_name,
             COUNT(d.id) AS donation_count
      FROM campaigns c
      JOIN organizations o ON c.organization_id = o.id
      LEFT JOIN donations d ON d.campaign_id = c.id
      GROUP BY c.id, c.organization_id, c.title, c.description, c.category,
               c.goal_amount, c.raised_amount, c.start_date, c.end_date,
               c.district, c.province, c.image_cid, c.on_chain_address,
               c.is_active, c.created_at, o.name
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("admin campaigns error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/campaigns/:id/toggle
router.patch("/campaigns/:id/toggle", auth, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    await db.query(
      "UPDATE campaigns SET is_active=CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?",
      [id]
    );
    const [[c]] = await db.query("SELECT is_active FROM campaigns WHERE id=?", [id]);
    res.json({ message: "Toggled", id, is_active: c?.is_active });
  } catch (err) {
    console.error("admin toggle campaign error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/campaigns/:id
router.delete("/campaigns/:id", auth, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const [[c]] = await db.query("SELECT id FROM campaigns WHERE id=?", [id]);
    if (!c) return res.status(404).json({ message: "Campaign not found" });
    await db.query("DELETE FROM donations WHERE campaign_id=?", [id]);
    await db.query("DELETE FROM milestones WHERE campaign_id=?", [id]);
    await db.query("DELETE FROM campaigns WHERE id=?", [id]);
    res.json({ message: "Campaign deleted", id });
  } catch (err) {
    console.error("admin delete campaign error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
