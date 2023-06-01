const mongoose = require("mongoose");
User = require("../models/user");
Friend = require("../models/friendship");

const fs = require("fs");

const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const upload = multer({
  limits: { fileSize: 16 * 1024 * 1024 },
  dest: "../uploads/",
}).single("picture"); // limit file size to 16 MB

require("dotenv").config();

exports.get_profile = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }
  User.findById(req.params.userid)
    .select("username photo bio friends")
    .populate("friends")
    .then((profile, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(profile);
      } catch (error) {
        return next(error);
      }
    });
};

exports.get_friends = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }
  User.findById(req.params.userid)
    .select("friends")
    .populate("friends")
    .then((list_friends, err) => {
      try {
        if (err) {
          return next(err);
        }
        return res.json(list_friends);
      } catch (error) {
        return next(error);
      }
    });
};

exports.add_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return next(err);
    }
    // current user id is the same as requested friend id
    if (authData.user._id === req.params.userid) {
      const error = new Error("Can't befriend self");
      return next(error);
    }

    // check that user exists
    try {
      const friendRequest = await User.findById(req.params.userid);
      if (friendRequest === null) {
        const error = new Error("Unable to find user.");
        return next(error);
      }
    } catch (err) {
      return next(err);
    }

    try {
      // friend request requested from current user
      Friend.findOneAndUpdate(
        {
          requester: authData.user._id,
          recipient: req.params.userid,
        },
        { status: 1 },
        { new: true, upsert: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $addToSet: { friends: result._id } }
        ).catch((err) => {
          if (err) {
            return next(err);
          }
        });
      });
    } catch (err) {
      return next(err);
    }
    try {
      // pending friend request from requested user
      Friend.findOneAndUpdate(
        {
          requester: req.params.userid,
          recipient: authData.user._id,
        },
        { status: 2 },
        { new: true, upsert: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        User.findByIdAndUpdate(
          { _id: req.params.userid },
          { $addToSet: { friends: result._id } }
        ).catch((err) => {
          if (err) {
            return next(err);
          }
        });
      });
    } catch (err) {
      return next(err);
    }
    return res.json({
      message: "Friend request sent.",
    });
  });
};

exports.accept_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return next(err);
    }

    try {
      // find friend request and change friendship status
      Friend.findOneAndUpdate(
        {
          requester: authData.user._id,
          recipient: req.params.userid,
          status: 2,
        },
        { status: 3 },
        { new: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        // if friend request not found
        if (result === null) {
          const error = new Error("Friend request not found.");
          return next(error);
        }
        Friend.findOneAndUpdate(
          {
            requester: req.params.userid,
            recipient: authData.user._id,
          },
          { status: 3 },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (result === null) {
            const error = new Error("Friend request not found.");
            return next(error);
          }
          return res.json({
            message: "Friend request accepted",
          });
        });
      });
    } catch (err) {
      return next(err);
    }
  });
};

exports.reject_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return next(err);
    }
    try {
      Friend.findOneAndDelete({
        requester: authData.user._id,
        recipient: req.params.userid,
        status: 2,
      }).then((result, err) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          const error = new Error("Friend request not found");
          return next(error);
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $pull: { friends: result._id } }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (!result) {
            const error = new Error("Couldn't update friend status");
            return next(error);
          }
          Friend.findOneAndDelete({
            requester: req.params.userid,
            recipient: authData.user._id,
            status: 1,
          }).then((result, err) => {
            if (err) {
              return next(err);
            }
            if (!result) {
              const error = new Error("Friend request not found.");
              return next(error);
            }

            User.findByIdAndUpdate(
              { _id: req.params.userid },
              { $pull: { friends: result._id } }
            ).then((result, err) => {
              if (err) {
                return next(err);
              }
              if (!result) {
                const error = new Error("Couldn't update friend status");
                return next(error);
              }
              return res.json({
                message: "Friend request removed",
              });
            });
          });
        });
      });
    } catch (err) {
      return next(err);
    }
  });
};

exports.unfriend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return next(error);
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return next(err);
    }
    try {
      Friend.findOneAndDelete({
        requester: authData.user._id,
        recipient: req.params.userid,
        status: 3,
      }).then((result, err) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          const error = new Error("Friend not found");
          return next(error);
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $pull: { friends: result._id } }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (!result) {
            const error = new Error("Couldn't update friend status");
            return next(error);
          }
          Friend.findOneAndDelete({
            requester: req.params.userid,
            recipient: authData.user._id,
            status: 3,
          }).then((result, err) => {
            if (err) {
              return next(err);
            }
            if (!result) {
              const error = new Error("Friend not found.");
              return next(error);
            }

            User.findByIdAndUpdate(
              { _id: req.params.userid },
              { $pull: { friends: result._id } }
            ).then((result, err) => {
              if (err) {
                return next(err);
              }
              if (!result) {
                const error = new Error("Couldn't update friend status");
                return next(error);
              }
              return res.json({
                message: "Unfriended user.",
              });
            });
          });
        });
      });
    } catch (err) {
      return next(err);
    }
  });
};

exports.search_users = [
  // Sanitize search field
  body("search").trim().escape(),

  //Process search request
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }
    User.find({
      username: { $regex: ".*" + req.body.search + ".*", $options: "i" },
    })
      .select("username")
      .then((result, err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          search: req.body.search,
          result: result,
        });
      });
  },
];

exports.update_bio = [
  // Validate and sanitize fields
  body("bio", "Bio exceeds character limit.")
    .trim()
    .isLength({ max: 200 })
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that user exists
    let isValid = validateObjectId(req.params.userid);
    if (!isValid) {
      const error = new Error("Unable to update bio.");
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
      // current user id doesn't match profile id
      if (authData.user._id !== req.params.userid) {
        const error = new Error("Not authorized.");
        return next(error);
      }

      User.findByIdAndUpdate(
        req.params.userid,
        {
          bio: req.body.bio,
        },
        { new: true }
      ).then((result, err) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          const error = new Error("Unable to update bio.");
          return next(error);
        }
        return res.json({
          message: "Bio updated",
          data: result.bio,
        });
      });
    });
  },
];

exports.update_photo = (req, res, next) => {
  // Check that user exists
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("Unable to update profile photo.");
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
    // current user id doesn't match profile id
    if (authData.user._id !== req.params.userid) {
      const error = new Error("Not authorized.");
      return next(error);
    } else {
      upload(req, res, function (err) {
        if (err) {
          return res.status(500).json({ error: "Unable to upload photo." });
        }
        if (req.file == null) {
          const error = new Error("No file selected.");
          return next(error);
        }
        let newImg = fs.readFileSync(req.file.path);
        let encImg = newImg.toString("base64");
        User.findByIdAndUpdate(
          req.params.userid,
          {
            photo: Buffer.from(encImg, "base64"),
          },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (!result) {
            const error = new Error("Unable to update profile photo");
            return next(error);
          }
          return res.json({
            message: "Profile photo updated",
          });
        });
      });
    }
  });
};

exports.update_username = [
  // Validate and sanitize fields
  body("username")
    .trim()
    .isLength({ min: 1, max: 75 })
    .escape()
    .withMessage("Username not within character limits (1 - 75 characters).")
    .isAlphanumeric()
    .escape()
    .withMessage("Only letters and numbers allowed"),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that user exists
    let isValid = validateObjectId(req.params.userid);
    if (!isValid) {
      const error = new Error("Unable to update username.");
      return next(error);
    }

    // Check if username is already taken
    User.findOne({ username: req.body.username }).then((result, err) => {
      if (result) {
        const error = new Error("Username already taken");
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
        // current user id doesn't match profile id
        if (authData.user._id !== req.params.userid) {
          const error = new Error("Not authorized.");
          return next(error);
        }

        User.findByIdAndUpdate(
          req.params.userid,
          {
            username: req.body.username,
          },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (!result) {
            const error = new Error("Unable to update username.");
            return next(error);
          }
          return res.json({
            message: "Username updated",
            data: result.username,
          });
        });
      });
    });
  },
];

exports.update_pwd = [
  // Validate and sanitize fields
  body("password", "Password must be at least 8 characters")
    .trim()
    .isLength({ min: 8 })
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Errors exist. Send json with error messages
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that user exists
    let isValid = validateObjectId(req.params.userid);
    if (!isValid) {
      const error = new Error("Unable to update password.");
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
      // current user id doesn't match profile id
      if (authData.user._id !== req.params.userid) {
        const error = new Error("Not authorized.");
        return next(error);
      }
      // hash password
      bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
        if (err) {
          return next(err);
        }
        User.findByIdAndUpdate(
          req.params.userid,
          { password: hashedPassword },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return next(err);
          }
          if (!result) {
            const error = new Error("Unable to update password.");
            return next(error);
          }
          return res.json({
            message: "Password updated",
            data: result.username,
          });
        });
      });
    });
  },
];

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
