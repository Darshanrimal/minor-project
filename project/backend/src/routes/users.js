// src/routes/users.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../models/db");
const bcrypt  = require("bcryptjs");

router.get("/profile", auth, async (req, res) => {
  try {
    const [[user]] = await db.query(
      "SELECT id,username,email,role,wallet_address,created_at FROM users WHERE id=?",
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/profile", auth, async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 3)
    return res.status(400).json({ message: "Username must be at least 3 characters" });
  try {
    const [existing] = await db.query(
      "SELECT id FROM users WHERE username=? AND id!=?",
      [username.trim(), req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Username already taken" });
    await db.query("UPDATE users SET username=? WHERE id=?", [username.trim(), req.user.id]);
    const [[user]] = await db.query(
      "SELECT id,username,email,role,wallet_address FROM users WHERE id=?",
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/password", auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ message: "current_password and new_password required" });
  if (new_password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  try {
    const [[user]] = await db.query(
      "SELECT password FROM users WHERE id=?", [req.user.id]
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await bcrypt.hash(new_password, 12);
    await db.query("UPDATE users SET password=? WHERE id=?", [hashed, req.user.id]);
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/org/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const [[org]] = await db.query(
      `SELECT id,name,description,website,district,province,
              contact_email,verification_status,created_at
       FROM organizations WHERE id=?`, [id]
    );
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const [campaigns] = await db.query(
      `SELECT id,title,category,goal_amount,raised_amount,is_active
       FROM campaigns WHERE organization_id=? ORDER BY created_at DESC`, [id]
    );
    res.json({ ...org, campaigns: campaigns || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;