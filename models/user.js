const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bcrypt = require("bcrypt");

const UserSchema = new Schema({
  username: { type: String, required: true, maxLength: 75 },
  password: { type: String, required: true },
  photo: { type: Buffer },
  bio: { type: String, maxLength: 200 },
  friends: [{ type: Schema.Types.ObjectId, ref: "Friend" }],
});

UserSchema.pre("save", async function (next) {
  const user = this;
  const hash = await bcrypt.hash(this.password, 10);

  this.password = hash;
  next();
});

// Export model
module.exports = mongoose.model("User", UserSchema);
