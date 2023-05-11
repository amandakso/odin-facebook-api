const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, maxLength: 75 },
  password: { type: String, required: true },
  photo: { type: Buffer },
  bio: { type: String, maxLength: 200 },
  friends: [{ type: Schema.Types.ObjectId, ref: "Friend" }],
});

// Export model
module.exports = mongoose.model("User", UserSchema);
