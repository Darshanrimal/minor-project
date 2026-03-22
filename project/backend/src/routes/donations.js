// src/routes/donations.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../models/db");

// GET /api/donations/wallet/:address
router.get("/wallet/:address", async (req, res) => {
  const address = (req.params.address || "").trim();
  if (!address) return res.status(400).json({ message: "Wallet address required" });
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.amount_sol, d.tx_signature, d.message, d.created_at,
              c.title AS campaign_title, c.id AS campaign_id
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.donor_wallet = ?
       ORDER BY d.created_at DESC`,
      [address]
    );
    res.json(rows);
  } catch (err) {
    console.error("wallet donations error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/donations/my — logged in user's all donations
router.get("/my", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.amount_sol, d.tx_signature, d.message, d.created_at,
              c.title AS campaign_title, c.id AS campaign_id,
              o.name AS organization_name
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       JOIN organizations o ON c.organization_id = o.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("my donations error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/donations/top-donors
router.get("/top-donors", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT donor_wallet,
              COUNT(*) AS total_donations,
              ROUND(SUM(amount_sol), 4) AS total_sol
       FROM donations
       GROUP BY donor_wallet
       ORDER BY total_sol DESC
       LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    console.error("top donors error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/donations/chart — last 7 days
router.get("/chart", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE(created_at) AS date,
              COUNT(*) AS count,
              ROUND(SUM(amount_sol), 4) AS total_sol
       FROM donations
       WHERE created_at >= DATE('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("chart error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/donations
router.post("/", auth, async (req, res) => {
  const { campaign_id, amount_sol, tx_signature, donor_wallet, message } = req.body;
  if (!campaign_id || !amount_sol || !tx_signature || !donor_wallet)
    return res.status(400).json({ message: "campaign_id, amount_sol, tx_signature, donor_wallet required" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[campaign]] = await conn.query(
      "SELECT id FROM campaigns WHERE id=? AND is_active=1", [campaign_id]
    );
    if (!campaign) { await conn.rollback(); return res.status(404).json({ message: "Campaign not found" }); }
    const [dup] = await conn.query("SELECT id FROM donations WHERE tx_signature=?", [tx_signature]);
    if (dup.length > 0) { await conn.rollback(); return res.status(409).json({ message: "Transaction already recorded" }); }
    await conn.query(
      "INSERT INTO donations (campaign_id,donor_wallet,user_id,amount_sol,tx_signature,message) VALUES (?,?,?,?,?,?)",
      [campaign_id, donor_wallet, req.user.id, amount_sol, tx_signature, message || null]
    );
    await conn.query("UPDATE campaigns SET raised_amount=raised_amount+? WHERE id=?", [amount_sol, campaign_id]);
    await conn.commit();
    res.status(201).json({ message: "Donation recorded", tx_signature, amount_sol });
  } catch (err) {
    await conn.rollback();
    console.error("POST /donations error:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally { conn.release(); }
});

module.exports = router;
