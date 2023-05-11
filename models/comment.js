const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new Schema(
  {
    postid: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, maxLength: 500 },
  },
  { timestamps: true }
);

// Export model
module.exports = mongoose.model("Comment", CommentSchema);
