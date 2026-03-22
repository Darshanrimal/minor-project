// src/routes/campaigns.js
const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const controller = require("../controllers/campaignController");

// IMPORTANT: static routes must come BEFORE parameterized ones
router.get("/stats/platform",       controller.platformStats);
router.get("/",                     controller.list);
router.get("/:id",                  controller.getOne);
router.post("/",              auth,  controller.create);
router.post("/:id/donate",    auth,  controller.recordDonation);
router.get("/:id/donations",        controller.getDonations);
router.post("/:id/milestones/:idx/release", auth, controller.releaseMilestone);

module.exports = router;
