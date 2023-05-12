const { body, validationResult } = require("express-validator");

const User = require("../models/user");

exports.signup = [
  // validate and sanitize fields
  body("username")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Username required")
    .isAlphanumeric()
    .escape()
    .withMessage("Only letters and numbers allowed"),
  body("password", "Password must be at least 8 characters long")
    .trim()
    .isLength({ min: 8 })
    .escape(),
  body("password_confirmation", "Must confirm password")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("password_confirmation").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password.");
    }
    return true;
  }),

  // Process request after validation and sanitization
  (req, res, done) => {
    // Extract the validation errors from request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. send json with error messages
      res.json({
        username: req.body.username,
        errors: errors.array(),
      });
      return;
    }

    // Create a new user
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    })
      .save()
      .then((user) => {
        res.json({
          message: "New user created",
          user: user,
        });
        return;
      })
      .catch((err) => {
        done(err);
      });
  },
];

exports.login = (req, res, next) => {
  res.send("TBD");
};
exports.logout = (req, res, next) => {
  res.send("TBD");
};
