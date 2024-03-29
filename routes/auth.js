var express = require("express");
var router = express.Router();

var auth_controller = require("../controllers/authController");

// Create new user
router.post("/signup", auth_controller.signup);

// Login user
router.post("/login", auth_controller.login);

// Guest login
router.post("/guest_login", auth_controller.guest_login);

// Logout user
router.put("/logout", auth_controller.logout);

module.exports = router;
