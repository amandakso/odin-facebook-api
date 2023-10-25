var express = require("express");
var router = express.Router();

var users_controller = require("../controllers/usersController");

// get a username's profile id
router.get("/username-search/:username", users_controller.username_search);

// get user profile
router.get("/:userid/profile/", users_controller.get_profile);

// get user's friends
router.get("/:userid/friends", users_controller.get_friends);

// check friendship status
router.get(
  "/check-friendship/:userid/:otherid",
  users_controller.get_friendship
);

// add friend
router.post("/:userid/friends/add-friend", users_controller.add_friend);

// accept friend request
router.put("/:userid/friends/accept-friend", users_controller.accept_friend);

// reject friend request
router.delete("/:userid/friends/reject-friend", users_controller.reject_friend);

// unfriend user
router.delete("/:userid/friends/unfriend", users_controller.unfriend);

// search users
router.get("/search", users_controller.search_users);

// update profile bio
router.put("/:userid/profile/update-bio", users_controller.update_bio);

// update profile photo
router.put("/:userid/profile/update-photo", users_controller.update_photo);

// update profile username
router.put(
  "/:userid/profile/update-username",
  users_controller.update_username
);

// update user password
router.put("/:userid/profile/update-pwd", users_controller.update_pwd);

module.exports = router;
