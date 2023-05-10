var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Odinbook API" });
});

var authRouter = require("./auth");
var postsRouter = require("./posts");
var usersRouter = require("./users");

router.use("/auth", authRouter);
//router.use("/posts", postsRouter);
//router.use("/users", usersRouter);

module.exports = router;
