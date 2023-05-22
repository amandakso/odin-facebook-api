const mongoose = require("mongoose");
User = require("../models/user");
Friend = require("../models/friendship");

const jwt = require("jsonwebtoken");

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
    // current user id doesn't match comment author id
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

exports.reject_friend = (req, res, next) => {
  res.send("TBD");
};

exports.unfriend = (req, res, next) => {
  res.send("TBD");
};

exports.search_users = (req, res, next) => {
  res.send("TBD");
};

exports.update_bio = (req, res, next) => {
  res.send("TBD");
};

exports.update_photo = (req, res, next) => {
  res.send("TBD");
};

exports.update_username = (req, res, next) => {
  res.send("TBD");
};

exports.update_pwd = (req, res, next) => {
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
