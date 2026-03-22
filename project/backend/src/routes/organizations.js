// src/routes/organizations.js
const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const controller = require("../controllers/orgController");

// IMPORTANT: /mine must be before /:id
router.get("/mine",          auth, controller.mine);
router.get("/",                    controller.list);
router.get("/:id",                 controller.getOne);
router.post("/",             auth,  controller.create);
router.patch("/:id/verify",  auth,  controller.verify);

module.exports = router;
