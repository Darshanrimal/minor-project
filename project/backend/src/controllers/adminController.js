// src/controllers/adminController.js
const db = require("../models/db");

const adminController = {

  // GET /api/admin/stats
  getStats: async (req, res) => {
    try {
      const [[stats]] = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM users)         AS total_users,
          (SELECT COUNT(*) FROM organizations) AS total_organizations,
          (SELECT COUNT(*) FROM organizations WHERE verification_status='pending') AS pending_orgs,
          (SELECT COUNT(*) FROM campaigns)     AS total_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE is_active=1) AS active_campaigns,
          (SELECT COUNT(*) FROM donations)     AS total_donations,
          (SELECT COALESCE(SUM(amount_sol),0) FROM donations) AS total_sol_raised
      `);
      res.json(stats);
    } catch (err) {
      console.error("getStats error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/admin/users
  getUsers: async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT id,username,email,role,wallet_address,created_at FROM users ORDER BY created_at DESC"
      );
      res.json(rows);
    } catch (err) {
      console.error("getUsers error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PUT /api/admin/users/:id/role
  updateUserRole: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });
    const { role } = req.body;
    if (!["donor","org_admin","admin"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    try {
      const [[user]] = await db.query("SELECT id FROM users WHERE id=?", [id]);
      if (!user) return res.status(404).json({ message: "User not found" });
      await db.query("UPDATE users SET role=? WHERE id=?", [role, id]);
      res.json({ message: "Role updated", id, role });
    } catch (err) {
      console.error("updateUserRole error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/admin/organizations
  getOrganizations: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT o.*, u.username, u.email AS user_email
        FROM organizations o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error("getOrganizations error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PUT /api/admin/organizations/:id/verify
  updateOrgVerification: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid organization ID" });
    const { verification_status, rejection_reason } = req.body;
    if (!["verified","rejected","pending"].includes(verification_status))
      return res.status(400).json({ message: "Invalid status" });
    try {
      const [[org]] = await db.query("SELECT id FROM organizations WHERE id=?", [id]);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      await db.query(
        "UPDATE organizations SET verification_status=?, rejection_reason=? WHERE id=?",
        [verification_status, rejection_reason || null, id]
      );
      res.json({ message: "Status updated", id, verification_status });
    } catch (err) {
      console.error("updateOrgVerification error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/admin/campaigns
  getCampaigns: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT c.*, o.name AS organization_name
        FROM campaigns c
        JOIN organizations o ON c.organization_id = o.id
        ORDER BY c.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error("getCampaigns error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PUT /api/admin/campaigns/:id/status
  updateCampaignStatus: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid campaign ID" });
    const { is_active } = req.body;
    if (is_active === undefined || is_active === null)
      return res.status(400).json({ message: "is_active required" });
    const activeVal = is_active ? 1 : 0;
    try {
      const [[campaign]] = await db.query("SELECT id FROM campaigns WHERE id=?", [id]);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      await db.query("UPDATE campaigns SET is_active=? WHERE id=?", [activeVal, id]);
      res.json({ message: `Campaign ${activeVal ? "activated" : "paused"}`, id, is_active: activeVal });
    } catch (err) {
      console.error("updateCampaignStatus error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // DELETE /api/admin/campaigns/:id
  deleteCampaign: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid campaign ID" });
    try {
      const [[campaign]] = await db.query("SELECT id FROM campaigns WHERE id=?", [id]);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      await db.query("DELETE FROM donations WHERE campaign_id=?", [id]);
      await db.query("DELETE FROM milestones WHERE campaign_id=?", [id]);
      await db.query("DELETE FROM campaigns WHERE id=?", [id]);
      res.json({ message: "Campaign deleted", id });
    } catch (err) {
      console.error("deleteCampaign error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = adminController;
