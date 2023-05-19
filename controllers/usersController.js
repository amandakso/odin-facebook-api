const mongoose = require("mongoose");
User = require("../models/user");
Friend = require("../models/friendship");

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
      console.log(profile);
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
  res.send("TBD");
};

exports.add_friend = (req, res, next) => {
  res.send("TBD");
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
