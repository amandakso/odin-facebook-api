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

exports.username_search = (req, res, next) => {
  // make username lowercase
  let username = req.params.username?.toLowerCase();

  User.findOne({ username: username })
    .select("_id")
    .then((profile, err) => {
      try {
        if (err) {
          return res.json({ error: err.message });
        } else {
          return res.json(profile);
        }
      } catch (error) {
        if (error instanceof Error) {
          return res.json({ error: error.message });
        }
      }
    });
};

exports.get_profile = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return res.json({ error: error.message });
  }
  User.findById(req.params.userid)
    .select("username photo bio friends")
    .populate("friends")
    .then((profile, err) => {
      try {
        if (err) {
          return res.json({ error: err.message });
        } else {
          return res.json(profile);
        }
      } catch (error) {
        if (error instanceof Error) {
          return res.json({ error: error.message });
        }
      }
    });
};

exports.get_friends = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return res.json({ error: error.message });
  }
  User.findById(req.params.userid)
    .select("friends")
    .populate("friends")
    .then((user, err) => {
      try {
        if (err) {
          return res.json({ error: err.message });
        }
        return res.json({ friends: user.friends });
      } catch (error) {
        return res.json({ error: error.message });
      }
    });
};

exports.get_friendship = (req, res, next) => {
  let isValid = validateObjectId(req.params.userid);
  let isValid2 = validateObjectId(req.params.otherid);
  if (!isValid || !isValid2) {
    const error = new Error("Unable to find users");
    return res.json({ error: error.message });
  }

  Friend.findOne({
    requester: req.params.userid,
    recipient: req.params.otherid,
  })
    .select("status")
    .then((result, err) => {
      try {
        if (err) {
          return res.json({ status: null, error: err.message });
        }
        if (!result) {
          return res.json({ status: result });
        }
        return res.json({ status: result.status });
      } catch (error) {
        if (error instanceof Error) {
          return res.json({ status: null, error: error.message });
        }
      }
    });
};

exports.add_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return res.json({ status: "fail", error: error.message });
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return res.json({ status: "fail", error: err.message });
    }
    // current user id is the same as requested friend id
    if (authData.user._id === req.params.userid) {
      const error = new Error("Can't befriend self");
      return res.json({ status: "fail", error: error.message });
    }

    // check that user exists
    try {
      const friendRequest = await User.findById(req.params.userid);
      if (friendRequest === null) {
        const error = new Error("Unable to find user.");
        return res.json({ status: "fail", error: error.message });
      }
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
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
          return res.json({ status: "fail", error: err.message });
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $addToSet: { friends: result._id } }
        ).catch((err) => {
          if (err) {
            return res.json({ status: "fail", error: err.message });
          }
        });
      });
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
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
          return res.json({ status: "fail", error: err.message });
        }
        User.findByIdAndUpdate(
          { _id: req.params.userid },
          { $addToSet: { friends: result._id } }
        ).catch((err) => {
          if (err) {
            return res.json({ status: "fail", error: err.message });
          }
        });
      });
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
    }
    return res.json({
      status: "success",
      message: "Friend request sent.",
    });
  });
};

exports.accept_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    res.json({ status: "fail", error: error.message });
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      res.json({ status: "fail", error: err.message });
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
          return res.json({ status: "fail", error: err.message });
        }
        // if friend request not found
        if (result === null) {
          const error = new Error("Friend request not found.");
          return res.json({ status: "fail", error: error.message });
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
            return res.json({ status: "fail", error: err.message });
          }
          if (result === null) {
            const error = new Error("Friend request not found.");
            return res.json({ status: "fail", error: error.message });
          }
          return res.json({
            status: "success",
            message: "Friend request accepted",
          });
        });
      });
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
    }
  });
};

exports.reject_friend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return res.json({ status: "fail", error: error.message });
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return res.json({ status: "fail", error: err.message });
    }
    try {
      Friend.findOneAndDelete({
        requester: authData.user._id,
        recipient: req.params.userid,
        status: 2,
      }).then((result, err) => {
        if (err) {
          return res.json({ status: "fail", error: err.message });
        }
        if (!result) {
          const error = new Error("Friend request not found");
          return res.json({ status: "fail", error: error.message });
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $pull: { friends: result._id } }
        ).then((result, err) => {
          if (err) {
            return res.json({ status: "fail", error: err.message });
          }
          if (!result) {
            const error = new Error("Couldn't update friend status");
            return res.json({ status: "fail", error: error.message });
          }
          Friend.findOneAndDelete({
            requester: req.params.userid,
            recipient: authData.user._id,
            status: 1,
          }).then((result, err) => {
            if (err) {
              return res.json({ status: "fail", error: err.message });
            }
            if (!result) {
              const error = new Error("Friend request not found.");
              return res.json({ status: "fail", error: error.message });
            }

            User.findByIdAndUpdate(
              { _id: req.params.userid },
              { $pull: { friends: result._id } }
            ).then((result, err) => {
              if (err) {
                return res.json({ status: "fail", error: err.message });
              }
              if (!result) {
                const error = new Error("Couldn't update friend status");
                return nres.json({ status: "fail", error: err.message });
              }
              return res.json({
                status: "success",
                message: "Friend request removed",
              });
            });
          });
        });
      });
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
    }
  });
};

exports.unfriend = (req, res, next) => {
  // Check that userid is in valid form
  let isValid = validateObjectId(req.params.userid);
  if (!isValid) {
    const error = new Error("User not found.");
    return res.json({ status: "fail", error: errir.message });
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, async (err, authData) => {
    if (err) {
      return res.json({ status: "fail", error: err.message });
    }
    try {
      Friend.findOneAndDelete({
        requester: authData.user._id,
        recipient: req.params.userid,
        status: 3,
      }).then((result, err) => {
        if (err) {
          return res.json({ status: "fail", error: err.message });
        }
        if (!result) {
          const error = new Error("Friend not found");
          return res.json({ status: "fail", error: error.message });
        }
        User.findByIdAndUpdate(
          { _id: authData.user._id },
          { $pull: { friends: result._id } }
        ).then((result, err) => {
          if (err) {
            return res.json({ status: "fail", error: err.message });
          }
          if (!result) {
            const error = new Error("Couldn't update friend status");
            return res.json({ status: "fail", error: error.message });
          }
          Friend.findOneAndDelete({
            requester: req.params.userid,
            recipient: authData.user._id,
            status: 3,
          }).then((result, err) => {
            if (err) {
              return res.json({ status: "fail", error: err.message });
            }
            if (!result) {
              const error = new Error("Friend not found.");
              return res.json({ status: "fail", error: error.message });
            }

            User.findByIdAndUpdate(
              { _id: req.params.userid },
              { $pull: { friends: result._id } }
            ).then((result, err) => {
              if (err) {
                return res.json({ status: "fail", error: err.message });
              }
              if (!result) {
                const error = new Error("Couldn't update friend status");
                return res.json({ status: "fail", error: error.message });
              }
              return res.json({
                status: "success",
                message: "Unfriended user.",
              });
            });
          });
        });
      });
    } catch (err) {
      return res.json({ status: "fail", error: err.message });
    }
  });
};

exports.search_users = (req, res, next) => {
  User.find({
    username: { $regex: ".*" + req.query.search + ".*", $options: "i" },
  })
    .select("username")
    .then((result, err) => {
      if (err) {
        return res.json({ error: err });
      }
      return res.json({
        search: req.query.search,
        result: result,
      });
    });
};

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
      return res.json({ error: error.message });
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
      // current user id doesn't match profile id
      if (authData.user._id !== req.params.userid) {
        const error = new Error("Not authorized.");
        return res.json({ error: error.message });
      }

      User.findByIdAndUpdate(
        req.params.userid,
        {
          bio: req.body.bio,
        },
        { new: true }
      ).then((result, err) => {
        if (err) {
          return res.json({ error: err.message });
        }
        if (!result) {
          const error = new Error("Unable to update bio.");
          return res.json({ error: error.message });
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
  console.log("isvalid: " + isValid);
  if (!isValid) {
    const error = new Error("Unable to update profile photo.");
    return res.json({ error: error.message });
  }

  // Extract bearer token
  let bearerToken = "";
  const bearerHeader = req.headers.authorization;
  bearerToken = extractBearerToken(bearerHeader);

  // Verify Token
  jwt.verify(bearerToken, process.env.jwt_key, (err, authData) => {
    if (err) {
      console.log("token " + err.message);
      return res.json({ error: err.message });
    }
    // current user id doesn't match profile id
    if (authData.user._id !== req.params.userid) {
      const error = new Error("Not authorized.");
      return res.json({ error: error.message });
    } else {
      upload(req, res, function (err) {
        if (err) {
          console.log("upload" + err.message);
          return res.status(500).json({ error: "Unable to upload photo." });
        }
        if (req.file == null) {
          const error = new Error("No file selected.");
          return res.json({ error: error.message });
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
            return res.json({ error: err.message });
          }
          if (!result) {
            const error = new Error("Unable to update profile photo");
            return res.json({ error: error.message });
          }
          return res.json({
            data: result.photo,
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
      return res.json({ error: error.message });
    }

    // Check if username is already taken
    User.findOne({ username: req.body.username }).then((result, err) => {
      if (err) {
        return res.json({ error: err.message });
      }
      if (result) {
        const error = new Error("Username already taken");
        return res.json({ error: error.message });
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
        // current user id doesn't match profile id
        if (authData.user._id !== req.params.userid) {
          const error = new Error("Not authorized.");
          return res.json({ error: error.message });
        }

        User.findByIdAndUpdate(
          req.params.userid,
          {
            username: req.body.username,
          },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return res.json({ error: err.message });
          }
          if (!result) {
            const error = new Error("Unable to update username.");
            return res.json({ error: error.message });
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
      return res.json({ error: error.message });
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
      // current user id doesn't match profile id
      if (authData.user._id !== req.params.userid) {
        const error = new Error("Not authorized.");
        return res.json({ error: error.message });
      }
      // hash password
      bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
        if (err) {
          return res.json({ error: err.message });
        }
        User.findByIdAndUpdate(
          req.params.userid,
          { password: hashedPassword },
          { new: true }
        ).then((result, err) => {
          if (err) {
            return res.json({ error: err.message });
          }
          if (!result) {
            const error = new Error("Unable to update password.");
            return res.json({ error: error.message });
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
