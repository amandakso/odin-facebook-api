const mongoose = require("mongoose");
const Comment = require("../models/comment");
const Likes = require("../models/likes");
const Post = require("../models/post");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

require("dotenv").config();

exports.get_posts = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("Unable to get posts.");
    return res.json({ error: error.message });
  }
  Post.find({ author: req.params.userid })
    .sort({ createdAt: -1 })
    .populate("author", "username")
    .then((list_posts, err) => {
      try {
        if (err) {
          return res.json({ error: err.message });
        }
        return res.json({ posts: list_posts });
      } catch (error) {
        return res.json({ error: error.message });
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
        return res.json({ error: err.message });
      }
      const post = new Post({
        author: authData.user._id,
        text: req.body.text,
      })
        .save()
        .then(() => {
          return res.json({
            success: true,
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
  // Check that post exists
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Unable to delete post.");
    return next(error);
  }
  Post.findById(req.params.postid)
    .select("author")
    .then((result, err) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        const error = new Error("Post not found. Unable to delete post.");
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

        Post.findByIdAndDelete(req.params.postid).then((result, err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            message: "Post deleted",
            data: result,
          });
        });
      });
    });
};

exports.get_likes = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Unable to find post.");
    return next(error);
  }
  Likes.findOne({ postid: req.params.postid })
    .populate("users", "username")
    .then((list_likes, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_likes);
      } catch (error) {
        return next(error);
      }
    });
};

exports.like_post = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Unable to find post.");
    return next(error);
  }

  // Check that post exists
  Post.findById(req.params.postid).then((result, err) => {
    if (err) {
      return next(err);
    }
    if (!result) {
      const error = new Error("Post not found. Unable to like post.");
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

      Likes.findOneAndUpdate(
        { postid: req.params.postid },
        { $addToSet: { users: authData.user._id } }, // doesn't add user if already in array
        { new: true, upsert: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "User liked post.",
          data: result,
        });
      });
    });
  });
};

exports.unlike_post = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Unable to find post.");
    return next(error);
  }

  // Check that post exists
  Post.findById(req.params.postid).then((result, err) => {
    if (err) {
      return next(err);
    }
    if (!result) {
      const error = new Error("Post not found. Unable to unlike post.");
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

      Likes.findOneAndUpdate(
        { postid: req.params.postid },
        { $pull: { users: authData.user._id } },
        { new: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "User unliked post.",
          data: result,
        });
      });
    });
  });
};

exports.get_comments = (req, res, next) => {
  let isValid = validateObjectId(req.params.postid);
  if (!isValid) {
    const error = new Error("Post not found");
    return next(error);
  }
  Comment.find({ postid: req.params.postid })
    .sort({ createdAt: -1 })
    .populate("author", "username")
    .then((list_comments, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_comments);
      } catch (error) {
        return next(error);
      }
    });
};

exports.get_comment = (req, res, next) => {
  let isValid = validateObjectId(req.params.commentid);
  if (!isValid) {
    const error = new Error("Invalid entry.");
    return next(error);
  }
  Comment.findById(req.params.commentid)
    .select("author text createdAt updatedAt")
    .populate("author", "username")
    .then((list_comment, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_comment);
      } catch (error) {
        return next(error);
      }
    });
};

exports.create_comment = [
  // Validate and sanitize fields
  body("text", "Comment exceeds character limit.")
    .trim()
    .isLength({ max: 500 })
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if post id is valid

    let isValid = validateObjectId(req.params.postid);

    if (!isValid) {
      const error = new Error("Post not found");
      return next(error);
    }
    // Check that post exists
    Post.findById(req.params.postid).then((result, err) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        const error = new Error("Post not found. Unable to comment on post.");
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
        const comment = new Comment({
          postid: req.params.postid,
          author: authData.user._id,
          text: req.body.text,
        })
          .save()
          .then(() => {
            return res.json({
              message: "New comment created",
              data: authData,
            });
          })
          .catch((err) => {
            return res.json({ error: err.message });
          });
      });
    });
  },
];

exports.update_comment = [
  // Validate and sanitize fields
  body("text", "Comment exceeds character limit.")
    .trim()
    .isLength({ max: 500 })
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that comment exists
    let isValid = validateObjectId(req.params.commentid);
    if (!isValid) {
      const error = new Error("Unable to update comment.");
      return next(error);
    }
    Comment.findById(req.params.commentid)
      .select("author")
      .then((result, err) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          const error = new Error(
            "Comment not found. Unable to update comment."
          );
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
          // current user id doesn't match comment author id
          if (authData.user._id !== result.author.toString()) {
            const error = new Error("Not authorized.");
            return next(error);
          }

          Comment.findByIdAndUpdate(req.params.commentid, {
            text: req.body.text,
          }).then((result, err) => {
            if (err) {
              return next(err);
            }
            return res.json({
              message: "Comment updated",
              data: result,
            });
          });
        });
      });
  },
];

exports.delete_comment = (req, res, next) => {
  // Check if comment id is valid

  let isValid = validateObjectId(req.params.commentid);

  if (!isValid) {
    const error = new Error("Comment not found");
    return next(error);
  }
  Comment.findById(req.params.commentid)
    .select("author postid")
    .lean("author")
    .populate("postid", "author")
    .then((result, err) => {
      console.log(result);
      if (err) {
        return next(err);
      }
      if (!result) {
        const error = new Error("Comment not found. Unable to update comment.");
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
        // current user id doesn't match comment author id and doesn't match post author id
        if (
          authData.user._id !== result.author.toString() &&
          authData.user.id !== result.postid.author
        ) {
          const error = new Error("Not authorized.");
          return next(error);
        }

        Comment.findByIdAndDelete(req.params.commentid).then((result, err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            message: "Comment deleted",
          });
        });
      });
    });
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
