const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, maxLength: 1000 },
  },
  { timestamps: true }
);

// Export model
module.exports = mongoose.model("Post", PostSchema);
