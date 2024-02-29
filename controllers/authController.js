const { body, validationResult } = require("express-validator");
const passport = require("../middleware/passportauth");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

require("dotenv").config();

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
  (req, res, next) => {
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
    // convert username to lowercase
    let username = req.body.username.toLowerCase();
    // Check if username is unique
    User.findOne({ username: username }).then((result, err) => {
      if (err) {
        return res.json({ error: err.message });
      } else if (result) {
        const error = new Error("Username already taken");
        return res.json({ error: error.message });
      } else {
        // Create a new user
        const user = new User({
          username: req.body.username,
          password: req.body.password,
        })
          .save()
          .then((user) => {
            res.json({
              message: `New user,${user.username}, created. Log in to account.`,
            });
            return;
          })
          .catch((err) => {
            return res.json({ error: err.message });
          });
      }
    });
  },
];

exports.login = async (req, res, next) => {
  passport.authenticate("login", async (err, user, message) => {
    try {
      if (err) {
        return res.json({ error: err.message });
      }
      if (message) {
        return res.json(message);
      }
      if (!user) {
        const error = new Error("An error occurred. User not found.");
        return res.json({ error: error.message });
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return res.json({ error: error.message });

        const body = { _id: user._id, username: user.username };
        const token = jwt.sign({ user: body }, process.env.jwt_key, {
          expiresIn: "1hr",
        });

        return res.json({ token });
      });
    } catch (error) {
      return res.json({ error: error.message });
    }
  })(req, res, next);
};

exports.guest_login = async (req, res, next) => {
  const username = process.env.GUEST_USER;
  try {
    const user = await User.findOne({ username });

    if (!user) {
      const error = new Error("Unable to get guest account. Try again later.");
      return res.json({ error: error.message });
    }
    req.login(user, { sessiong: false }, async (error) => {
      if (error) return res.json({ error: error.message });

      const body = { _id: user._id, username: user.username };
      const token = jwt.sign({ user: body }, process.env.jwt_key, {
        expiresIn: "1hr",
      });

      return res.json({ token });
    });
  } catch (error) {
    return res.json({ error: error.message });
  }
};

exports.logout = (req, res) => {
  const authHeader = req.headers["authorization"];
  jwt.sign(authHeader, "", { expiresIn: 1 }, (logout, err) => {
    if (logout) {
      res.json({ logout: true, message: "You have been logged out" });
    } else {
      res.json({ logout: false, message: err.message });
    }
  });
};
