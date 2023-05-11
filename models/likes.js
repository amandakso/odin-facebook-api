const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LikesSchema = new Schema({
  postid: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  users: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

// Export model
module.exports = mongoose.model("Likes", LikesSchema);
