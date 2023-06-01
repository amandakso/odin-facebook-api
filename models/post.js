const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Likes = require("./likes");
const Comment = require("./comment");

const PostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, maxLength: 1000 },
  },
  { timestamps: true }
);

// remove likes and comments of to-be-deleted post
PostSchema.pre("findOneAndDelete", async function (next) {
  try {
    const post = this;
    await Likes.deleteMany({ postid: { $eq: this.getQuery()._id } })
      .catch(function (err) {
        return next(err);
      })
      .then(() => {
        Comment.deleteMany({ postid: { $eq: this.getQuery()._id } }).catch(
          function (err) {
            return next(err);
          }
        );
      });
  } catch (err) {
    return next(err);
  }
  next();
});

// Export model
module.exports = mongoose.model("Post", PostSchema);
