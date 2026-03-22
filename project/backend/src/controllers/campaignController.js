// src/controllers/campaignController.js
const db  = require("../models/db");
const jwt = require("jsonwebtoken"); // top-level, not inside handlers

const campaignController = {

  // GET /api/campaigns
  list: async (req, res) => {
    try {
      const { category, province, mine } = req.query;
      let query = `
        SELECT c.id, c.title, c.description, c.category, c.goal_amount,
               c.raised_amount, c.start_date, c.end_date, c.is_active,
               c.image_cid, c.district, c.province, c.on_chain_address, c.created_at,
               o.name AS organization_name, o.id AS organization_id
        FROM campaigns c
        JOIN organizations o ON c.organization_id = o.id
        WHERE 1=1
      `;
      const params = [];

      if (mine === "true") {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          query += ` AND o.user_id = ?`;
          params.push(decoded.id);
        } catch {
          return res.status(401).json({ message: "Invalid token" });
        }
      } else {
        query += ` AND c.is_active = 1`;
      }

      if (category) { query += ` AND c.category = ?`;  params.push(category); }
      if (province)  { query += ` AND c.province = ?`;  params.push(province); }
      query += ` ORDER BY c.created_at DESC`;

      const [campaigns] = await db.query(query, params);

      // Fetch milestones for all returned campaigns
      const ids = campaigns.map(c => c.id);
      let milestones = [];
      if (ids.length > 0) {
        [milestones] = await db.queryIn(
          `SELECT * FROM milestones WHERE campaign_id IN (?) ORDER BY milestone_index ASC`,
          ids
        );
      }

      const result = campaigns.map(c => ({
        ...c,
        milestones: milestones.filter(m => m.campaign_id === c.id),
      }));

      res.json({ campaigns: result, total: result.length });
    } catch (err) {
      console.error("Campaign list error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/campaigns/stats/platform
  platformStats: async (req, res) => {
    try {
      const [[stats]] = await db.query(`
        SELECT
          COUNT(DISTINCT c.id)              AS total_campaigns,
          COALESCE(SUM(c.raised_amount), 0) AS total_donated,
          COUNT(DISTINCT d.donor_wallet)    AS total_donors,
          COUNT(DISTINCT o.id)              AS total_organizations
        FROM campaigns c
        LEFT JOIN donations d ON d.campaign_id = c.id
        LEFT JOIN organizations o ON o.verification_status = 'verified'
      `);
      res.json(stats);
    } catch (err) {
      console.error("Platform stats error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/campaigns/:id
  getOne: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid campaign ID" });

      const [[campaign]] = await db.query(
        `SELECT c.*, o.name AS organization_name, o.id AS organization_id
         FROM campaigns c
         JOIN organizations o ON c.organization_id = o.id
         WHERE c.id = ?`,
        [id]
      );
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const [milestones] = await db.query(
        `SELECT * FROM milestones WHERE campaign_id = ? ORDER BY milestone_index ASC`,
        [id]
      );
      const [donations] = await db.query(
        `SELECT donor_wallet, amount_sol, tx_signature, message, created_at
         FROM donations WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 20`,
        [id]
      );
      res.json({ ...campaign, milestones, recent_donations: donations });
    } catch (err) {
      console.error("Campaign getOne error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // POST /api/campaigns
  create: async (req, res) => {
    if (!["org_admin", "admin"].includes(req.user.role))
      return res.status(403).json({ message: "org_admin role required" });

    const {
      title, description, category, goal_amount,
      start_date, end_date, district, province,
      image_cid, organization_id, milestones = [],
    } = req.body;

    if (!title || !description || !category || !goal_amount || !start_date || !end_date)
      return res.status(400).json({ message: "title, description, category, goal_amount, start_date, end_date are required" });

    const parsedGoal = parseFloat(goal_amount);
    if (isNaN(parsedGoal) || parsedGoal <= 0)
      return res.status(400).json({ message: "goal_amount must be a positive number" });

    if (milestones.length > 0) {
      const total = milestones.reduce((s, m) => s + parseFloat(m.percentage || 0), 0);
      if (Math.abs(total - 100) > 0.1)
        return res.status(400).json({ message: "Milestone percentages must total 100%" });
    }

    // Verify org belongs to this user and is verified
    const [[org]] = await db.query(
      `SELECT id, verification_status FROM organizations WHERE id = ? AND user_id = ?`,
      [organization_id, req.user.id]
    );
    if (!org)
      return res.status(403).json({ message: "Organization not found or not yours" });
    if (org.verification_status !== "verified")
      return res.status(403).json({ message: "Organization must be verified by admin first" });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO campaigns
          (title, description, category, goal_amount, raised_amount,
           start_date, end_date, district, province, image_cid, organization_id, is_active)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 1)`,
        [title, description, category, parsedGoal,
         start_date, end_date,
         district || null, province || null,
         image_cid || null, org.id]
      );

      const campaignId = result.insertId;

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        await conn.query(
          `INSERT INTO milestones
            (campaign_id, milestone_index, title, description, percentage, target_date, is_released)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [campaignId, i, m.title, m.description || null,
           parseFloat(m.percentage), m.target_date || null]
        );
      }

      await conn.commit();

      const [[campaign]] = await db.query(
        "SELECT * FROM campaigns WHERE id = ?", [campaignId]
      );
      const [ms] = await db.query(
        "SELECT * FROM milestones WHERE campaign_id = ? ORDER BY milestone_index", [campaignId]
      );
      res.status(201).json({ ...campaign, milestones: ms });
    } catch (err) {
      await conn.rollback();
      console.error("Campaign create error:", err.message);
      res.status(500).json({ message: "Server error" });
    } finally {
      conn.release();
    }
  },

  // POST /api/campaigns/:id/donate
  recordDonation: async (req, res) => {
    const { amount_sol, tx_signature, donor_wallet, message } = req.body;

    if (!amount_sol || !tx_signature || !donor_wallet)
      return res.status(400).json({ message: "amount_sol, tx_signature, donor_wallet are required" });

    const parsedAmount = parseFloat(amount_sol);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ message: "amount_sol must be a positive number" });

    const campaignId = parseInt(req.params.id, 10);
    if (isNaN(campaignId))
      return res.status(400).json({ message: "Invalid campaign ID" });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[campaign]] = await conn.query(
        "SELECT id FROM campaigns WHERE id = ? AND is_active = 1",
        [campaignId]
      );
      if (!campaign) {
        await conn.rollback();
        return res.status(404).json({ message: "Campaign not found or inactive" });
      }

      // Prevent duplicate transactions
      const [dup] = await conn.query(
        "SELECT id FROM donations WHERE tx_signature = ?", [tx_signature]
      );
      if (dup.length > 0) {
        await conn.rollback();
        return res.status(409).json({ message: "Transaction already recorded" });
      }

      await conn.query(
        `INSERT INTO donations
          (campaign_id, donor_wallet, user_id, amount_sol, tx_signature, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [campaignId, donor_wallet, req.user.id, parsedAmount,
         tx_signature, message?.trim() || null]
      );

      await conn.query(
        `UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?`,
        [parsedAmount, campaignId]
      );

      await conn.commit();

      res.status(201).json({
        message: "Donation recorded successfully",
        tx_signature,
        amount_sol: parsedAmount,
      });
    } catch (err) {
      await conn.rollback();
      console.error("Donation record error:", err.message);
      res.status(500).json({ message: "Server error" });
    } finally {
      conn.release();
    }
  },

  // GET /api/campaigns/:id/donations
  getDonations: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid campaign ID" });

      const [rows] = await db.query(
        `SELECT donor_wallet, amount_sol, tx_signature, message, created_at
         FROM donations WHERE campaign_id = ? ORDER BY created_at DESC`,
        [id]
      );
      res.json(rows);
    } catch (err) {
      console.error("getDonations error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/donations/wallet/:address
  getDonationsByWallet: async (req, res) => {
    try {
      const address = req.params.address?.trim();
      if (!address) return res.status(400).json({ message: "Wallet address required" });

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
      console.error("getDonationsByWallet error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  // POST /api/campaigns/:id/milestones/:idx/release
  releaseMilestone: async (req, res) => {
    const { evidence_cid, tx_signature } = req.body;
    const campaignId = parseInt(req.params.id, 10);
    const milestoneIdx = parseInt(req.params.idx, 10);

    if (isNaN(campaignId) || isNaN(milestoneIdx))
      return res.status(400).json({ message: "Invalid campaign ID or milestone index" });

    try {
      const [[campaign]] = await db.query(
        `SELECT c.id, o.user_id
         FROM campaigns c
         JOIN organizations o ON c.organization_id = o.id
         WHERE c.id = ?`,
        [campaignId]
      );
      if (!campaign)
        return res.status(404).json({ message: "Campaign not found" });
      if (campaign.user_id !== req.user.id)
        return res.status(403).json({ message: "Not authorized — you do not own this campaign" });

      await db.query(
        `UPDATE milestones
         SET is_released = 1,
             evidence_cid = ?,
             tx_signature = ?,
             released_at = datetime('now')
         WHERE campaign_id = ? AND milestone_index = ?`,
        [evidence_cid || null, tx_signature || null, campaignId, milestoneIdx]
      );

      res.json({ message: "Milestone released successfully" });
    } catch (err) {
      console.error("releaseMilestone error:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = campaignController;
