// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const db     = require("../models/db");

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

const authController = {
  register: async (req, res) => {
    let { username, email, password, role } = req.body;

    username = username ? String(username).trim() : "";
    email = email ? String(email).trim().toLowerCase() : "";
    role = ["donor", "org_admin"].includes(role) ? role : "donor";

    if (!username || !email || !password)
      return res.status(400).json({ message: "username, email and password required" });

    if (username.length < 3)
      return res.status(400).json({ message: "Username must be at least 3 characters" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Invalid email format" });

    const safeRole = role;

    try {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?",
        [email, username.toLowerCase()]
      );

      if (existing.length > 0)
        return res.status(409).json({ message: "Email or username already taken" });

      const hashed = await bcrypt.hash(password, 12);
      const [result] = await db.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashed, safeRole]
      );
      const [[user]] = await db.query(
        "SELECT id, username, email, role, wallet_address FROM users WHERE id = ?",
        [result.insertId]
      );

      if (!user)
        return res.status(500).json({ message: "User creation failed" });

      res.status(201).json({ token: signToken(user), user });
    } catch (err) {
      console.error("Register error:", err.message || err);
      if (err.message && err.message.toLowerCase().includes("unique")) {
        return res.status(409).json({ message: "Email or username already taken" });
      }
      res.status(500).json({ message: "Server error" });
    }
  },

  login: async (req, res) => {
    let { email, password } = req.body;

    email = email ? String(email).trim().toLowerCase() : "";
    password = password ? String(password) : "";

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    try {
      const [[user]] = await db.query(
        "SELECT id, username, email, password, role, wallet_address FROM users WHERE LOWER(email) = ?",
        [email]
      );
      if (!user) {
        console.warn("Login attempt failed: user not found for email", email.slice(0, 5) + "***");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        console.warn("Login attempt failed: invalid password for email", email.slice(0, 5) + "***");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const { password: _, ...safeUser } = user;
      res.json({ token: signToken(user), user: safeUser });
    } catch (err) {
      console.error("Login error:", err.message || err);
      res.status(500).json({ message: "Server error" });
    }
  },

  me: async (req, res) => {
    try {
      const [[user]] = await db.query(
        "SELECT id, username, email, role, wallet_address, created_at FROM users WHERE id = ?",
        [req.user.id]
      );
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      console.error("Me error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  linkWallet: async (req, res) => {
    const { wallet_address } = req.body;
    if (!wallet_address)
      return res.status(400).json({ message: "wallet_address required" });
    try {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE wallet_address = ? AND id != ?",
        [wallet_address, req.user.id]
      );
      if (existing.length > 0)
        return res.status(409).json({ message: "Wallet linked to another account" });
      await db.query(
        "UPDATE users SET wallet_address = ? WHERE id = ?",
        [wallet_address, req.user.id]
      );
      const [[user]] = await db.query(
        "SELECT id, username, email, role, wallet_address FROM users WHERE id = ?",
        [req.user.id]
      );
      res.json(user);
    } catch (err) {
      console.error("linkWallet error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = authController;
