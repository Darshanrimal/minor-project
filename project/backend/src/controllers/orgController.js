// src/controllers/orgController.js
const db = require("../models/db");

const orgController = {
  // GET /api/organizations
  list: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, name, description, website, district, province,
                contact_email, verification_status, created_at
         FROM organizations WHERE verification_status = 'verified'
         ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Org list error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/organizations/mine
  mine: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, name, description, website, district, province,
                contact_email, contact_phone, registration_number,
                docs_cid, verification_status, rejection_reason, created_at
         FROM organizations WHERE user_id = ? LIMIT 1`,
        [req.user.id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "No organization found for this account" });
      res.json(rows[0]);
    } catch (err) {
      console.error("Org mine error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/organizations/:id
  getOne: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, name, description, website, district, province,
                contact_email, verification_status
         FROM organizations WHERE id = ?`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "Organization not found" });
      res.json(rows[0]);
    } catch (err) {
      console.error("Org getOne error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // POST /api/organizations
  create: async (req, res) => {
    const { name, description, website, district, province,
            registration_number, contact_email, contact_phone, docs_cid } = req.body;

    if (!name || !description || !district || !province || !contact_email)
      return res.status(400).json({ message: "name, description, district, province, contact_email are required" });

    try {
      const [existing] = await db.query(
        "SELECT id FROM organizations WHERE user_id = ?", [req.user.id]
      );
      if (existing.length > 0)
        return res.status(409).json({ message: "You already have a registered organization" });

      const [result] = await db.query(
        `INSERT INTO organizations
          (user_id, name, description, website, district, province,
           registration_number, contact_email, contact_phone, docs_cid, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [req.user.id, name, description, website || null, district, province,
         registration_number || null, contact_email, contact_phone || null, docs_cid || null]
      );
      const [[org]] = await db.query("SELECT * FROM organizations WHERE id = ?", [result.insertId]);
      res.status(201).json(org);
    } catch (err) {
      console.error("Org create error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PATCH /api/organizations/:id/verify  (admin only - kept for backward compat)
  verify: async (req, res) => {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin only" });
    const { verification_status, rejection_reason } = req.body;
    if (!["verified", "rejected", "pending"].includes(verification_status))
      return res.status(400).json({ message: "Invalid status" });
    try {
      await db.query(
        "UPDATE organizations SET verification_status = ?, rejection_reason = ? WHERE id = ?",
        [verification_status, rejection_reason || null, req.params.id]
      );
      const [[org]] = await db.query("SELECT * FROM organizations WHERE id = ?", [req.params.id]);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      res.json(org);
    } catch (err) {
      console.error("Org verify error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = orgController;
