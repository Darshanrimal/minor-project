// src/routes/auth.js
const express    = require("express");
const router     = express.Router();
const authMw     = require("../middleware/auth");
const controller = require("../controllers/authController");

router.post("/register", controller.register);
router.post("/login",    controller.login);
router.get("/me",        authMw, controller.me);
router.patch("/wallet",  authMw, controller.linkWallet);

module.exports = router;
