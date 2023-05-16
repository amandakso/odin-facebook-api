const mongoose = require("mongoose");
const Post = require("../models/post");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

require("dotenv").config();

exports.get_posts = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    return next();
  }
  Post.find({ author: req.params.userid })
    .sort({ createdAt: -1 })
    .populate("author", "username")
    .then((list_posts, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_posts);
      } catch (error) {
        return next(error);
      }
    });
};

exports.get_post = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    return next();
  }
  Post.findById(req.params.postid)
    .select("author text createdAt updatedAt")
    .populate("author", "username")
    .then((list_post, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_post);
      } catch (error) {
        return next(error);
      }
    });
};

exports.create_post = [
  // Validate and sanitize fields
  body("text", "Post exceeds character limit.")
    .trim()
    .isLength({ max: 1000 })
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract bearer token
    let bearerToken = "";
    const bearerHeader = req.headers.authorization;
    bearerToken = extractBearerToken(bearerHeader);

    // Verify Token
    jwt.verify(bearerToken, process.env.jwt_key, (err, authData) => {
      if (err) {
        return next(err);
      }
      const post = new Post({
        author: authData.user._id,
        text: req.body.text,
      })
        .save()
        .then(() => {
          return res.json({
            message: "New post created",
            data: authData,
          });
        })
        .catch((err) => {
          return res.json({ error: err.message });
        });
    });
  },
];

exports.edit_post = (req, res, next) => {
  res.send("TBD");
};

exports.delete_post = (req, res, next) => {
  res.send("TBD");
};

exports.get_likes = (req, res, next) => {
  res.send("TBD");
};

exports.like_post = (req, res, next) => {
  res.send("TBD");
};

exports.unlike_post = (req, res, next) => {
  res.send("TBD");
};

exports.get_comments = (req, res, next) => {
  res.send("TBD");
};

exports.get_comment = (req, res, next) => {
  res.send("TBD");
};

exports.create_comment = (req, res, next) => {
  res.send("TBD");
};

exports.update_comment = (req, res, next) => {
  res.send("TBD");
};

exports.delete_comment = (req, res, next) => {
  res.send("TBD");
};

function validateObjectId(id) {
  isValid = mongoose.Types.ObjectId.isValid(id);
  return isValid;
}

function extractBearerToken(bearerHeader) {
  if (typeof bearerHeader !== "undefined") {
    // Split at the space
    const bearer = bearerHeader.split(" ");
    bearerToken = bearer[1];
    return bearerToken;
  } else {
    return bearerHeader;
  }
}
