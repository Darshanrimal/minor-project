// src/controllers/adminController.js
const db = require("../models/db");

const adminController = {

  // GET /api/admin/stats
  getStats: async (req, res) => {
    try {
      const [[stats]] = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM users)         AS total_users,
          (SELECT COUNT(*) FROM users WHERE role='donor') AS total_donors,
          (SELECT COUNT(*) FROM users WHERE role='org_admin') AS total_org_admins,
          (SELECT COUNT(*) FROM organizations) AS total_organizations,
          (SELECT COUNT(*) FROM organizations WHERE verification_status='verified') AS verified_orgs,
          (SELECT COUNT(*) FROM organizations WHERE verification_status='pending') AS pending_orgs,
          (SELECT COUNT(*) FROM campaigns)     AS total_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE is_active=1) AS active_campaigns,
          (SELECT COUNT(*) FROM donations)     AS total_donations,
          (SELECT COALESCE(SUM(amount_sol),0) FROM donations WHERE payment_method='sol') AS total_sol_raised,
          (SELECT COALESCE(SUM(amount_npr),0) FROM donations WHERE payment_method='esewa') AS total_npr_raised,
          (SELECT COALESCE(AVG(amount_sol),0) FROM donations WHERE payment_method='sol') AS avg_donation
      `);

      // Recent activity — show correct amount per payment method
      const [recent] = await db.query(`
        SELECT d.amount_sol, d.amount_npr, d.payment_method,
               d.donor_wallet, d.tx_signature, d.blockchain_ref,
               d.esewa_ref_id, d.created_at,
               c.title AS campaign_title
        FROM donations d
        JOIN campaigns c ON d.campaign_id = c.id
        ORDER BY d.created_at DESC
        LIMIT 8
      `);

      // Monthly trend (SOL only for chart)
      const [trend] = await db.query(`
        SELECT strftime('%Y-%m', created_at) AS month,
               COUNT(*) AS count,
               ROUND(SUM(CASE WHEN payment_method='sol' THEN amount_sol ELSE 0 END), 4) AS total_sol,
               ROUND(SUM(CASE WHEN payment_method='esewa' THEN amount_npr ELSE 0 END), 2) AS total_npr
        FROM donations
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
        LIMIT 6
      `);

      res.json({
        ...stats,
        recent_activity: recent,
        trend: trend.reverse(),
      });
    } catch (err) {
      console.error("getStats error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/admin/users
  getUsers: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT u.id, u.username, u.email, u.role, u.wallet_address, u.created_at,
               COUNT(d.id) AS donation_count,
               COALESCE(SUM(CASE WHEN d.payment_method='sol' THEN d.amount_sol ELSE 0 END), 0) AS total_donated,
               COALESCE(SUM(CASE WHEN d.payment_method='sol' THEN d.amount_sol ELSE 0 END), 0) AS total_sol_donated,
               COALESCE(SUM(CASE WHEN d.payment_method='esewa' THEN d.amount_npr ELSE 0 END), 0) AS total_npr_donated
        FROM users u
        LEFT JOIN donations d ON d.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
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
        SELECT o.*, u.username, u.email AS user_email,
               COUNT(DISTINCT c.id) AS campaign_count,
               COALESCE(SUM(CASE WHEN d.payment_method='sol' THEN d.amount_sol ELSE 0 END), 0) AS total_sol_raised,
               COALESCE(SUM(CASE WHEN d.payment_method='esewa' THEN d.amount_npr ELSE 0 END), 0) AS total_npr_raised,
               COALESCE(SUM(CASE WHEN d.payment_method='sol' THEN d.amount_sol ELSE 0 END), 0) AS total_raised
        FROM organizations o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN campaigns c ON c.organization_id = o.id
        LEFT JOIN donations d ON d.campaign_id = c.id
        GROUP BY o.id
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
        SELECT c.*, o.name AS organization_name,
               COUNT(d.id) AS donation_count,
               COALESCE(SUM(CASE WHEN d.payment_method='sol' THEN d.amount_sol ELSE 0 END), 0) AS total_sol_raised,
               COALESCE(SUM(CASE WHEN d.payment_method='esewa' THEN d.amount_npr ELSE 0 END), 0) AS total_npr_raised
        FROM campaigns c
        JOIN organizations o ON c.organization_id = o.id
        LEFT JOIN donations d ON d.campaign_id = c.id
        GROUP BY c.id
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

  // PATCH /api/admin/campaigns/:id/toggle
  toggleCampaign: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid campaign ID" });
    try {
      const [[campaign]] = await db.query("SELECT id, is_active FROM campaigns WHERE id=?", [id]);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      const newActive = campaign.is_active ? 0 : 1;
      await db.query("UPDATE campaigns SET is_active=? WHERE id=?", [newActive, id]);
      res.json({ message: `Campaign ${newActive ? "activated" : "paused"}`, id, is_active: newActive });
    } catch (err) {
      console.error("toggleCampaign error:", err.message);
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
      await db.query("DELETE FROM donations  WHERE campaign_id=?", [id]);
      await db.query("DELETE FROM milestones WHERE campaign_id=?", [id]);
      await db.query("DELETE FROM campaigns  WHERE id=?", [id]);
      res.json({ message: "Campaign deleted", id });
    } catch (err) {
      console.error("deleteCampaign error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = adminController;
