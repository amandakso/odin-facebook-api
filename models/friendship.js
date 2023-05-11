const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FriendshipSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: Number,
      enums: [
        0, //'add friend',
        1, //'requested',
        2, //'pending',
        3, //'friends'
      ],
    },
  },
  { timestamps: true }
);

// Export model
module.exports = mongoose.model("Friend", FriendshipSchema);
