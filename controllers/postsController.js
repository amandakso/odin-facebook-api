const mongoose = require("mongoose");
const Likes = require("../models/likes");
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

exports.edit_post = [
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

    // Check that post exists
    let isValid = validateObjectId(req.params.postid);
    if (!isValid) {
      const error = new Error("Unable to update post.");
      return next(error);
    }
    Post.findById(req.params.postid)
      .select("author")
      .then((result, err) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          const error = new Error("Post not found. Unable to update post.");
          return next(error);
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
          // current user id doesn't match post author id
          if (authData.user._id !== result.author.toString()) {
            const error = new Error("Not authorized.");
            return next(error);
          }

          Post.findByIdAndUpdate(req.params.postid, {
            text: req.body.text,
          }).then((result, err) => {
            if (err) {
              return next(err);
            }
            return res.json({
              message: "Post updated",
              data: result,
            });
          });
        });
      });
  },
];

exports.delete_post = (req, res, next) => {
  res.send("TBD");
  // have to delete comments and likes too
};

exports.get_likes = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Unable to find post.");
    console.log("test");
    return next(error);
  }
  Likes.findOne({ postid: req.params.postid })
    .populate("user", "username")
    .then((list_likes, err) => {
      try {
        console.log("test2");
        if (err) {
          console.log("test3");
          return next(err);
        }
        console.log(list_likes);
        return res.json(list_likes);
      } catch (error) {
        console.log("test 5");
        return next(error);
      }
    });
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
