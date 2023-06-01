const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bcrypt = require("bcrypt");

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    maxLength: 75,
    minLenth: 1,
    unique: true,
  },
  password: { type: String, required: true },
  photo: { type: Buffer },
  bio: { type: String, maxLength: 200 },
  friends: [{ type: Schema.Types.ObjectId, ref: "Friend" }],
});

// hash password of new user
UserSchema.pre("save", async function (next) {
  const user = this;
  const hash = await bcrypt.hash(this.password, 10);

  this.password = hash;
  next();
});

// check if password is the same as password in db
UserSchema.methods.isValidPassword = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);

  return compare;
};

// Export model
module.exports = mongoose.model("User", UserSchema);
