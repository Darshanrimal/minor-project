// src/routes/admin.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const adminController = require("../controllers/adminController");

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });
  next();
}

// Route through the shared controller so admin endpoints and admin UI stay on one data contract.
router.get("/stats", auth, adminOnly, adminController.getStats);

// GET /api/admin/users
router.get("/users", auth, adminOnly, adminController.getUsers);

// Keep PATCH and PUT so existing admin screens keep working while the client standardizes on PATCH.
router.patch("/users/:id/role", auth, adminOnly, adminController.updateUserRole);
router.put("/users/:id/role", auth, adminOnly, adminController.updateUserRole);

// GET /api/admin/organizations
router.get("/organizations", auth, adminOnly, adminController.getOrganizations);

// Keep PATCH and PUT so existing admin screens keep working while the client standardizes on PATCH.
router.patch("/organizations/:id/verify", auth, adminOnly, adminController.updateOrgVerification);
router.put("/organizations/:id/verify", auth, adminOnly, adminController.updateOrgVerification);

// GET /api/admin/campaigns
router.get("/campaigns", auth, adminOnly, adminController.getCampaigns);

router.patch("/campaigns/:id/toggle", auth, adminOnly, adminController.toggleCampaign);
router.put("/campaigns/:id/status", auth, adminOnly, adminController.updateCampaignStatus);

// DELETE /api/admin/campaigns/:id
router.delete("/campaigns/:id", auth, adminOnly, adminController.deleteCampaign);

module.exports = router;
