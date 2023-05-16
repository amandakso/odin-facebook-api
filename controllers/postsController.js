const mongoose = require("mongoose");
const Post = require("../models/post");

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
        return next(err);
      }
    });
};

exports.get_post = (req, res, next) => {
  res.send("TBD");
};

exports.create_post = (req, res, next) => {
  res.send("TBD");
};

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
