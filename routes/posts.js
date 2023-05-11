var express = require("express");
var router = express.Router();

var posts_controller = require("../controllers/postsController");

// Posts Routes //

// Get all of a user's posts
router.get("/user/:userid", posts_controller.get_posts);

// Get a specific post
router.get("/:postid", posts_controller.get_post);

// Create post
router.post("/", posts_controller.create_post);

// Edit post
router.put("/:postid", posts_controller.edit_post);

// Delete post
router.delete("/:postid", posts_controller.delete_post);

// Likes Routes //

// get likes of a post
router.get("/:postid/likes", posts_controller.get_likes);

// like a post
router.put("/:postid/likes/like", posts_controller.like_post);

// unlike a post
router.put("/:postid/likes/unlike", posts_controller.unlike_post);

// Comments Routes //

// get all comments of a post
router.get("/:postid/comments", posts_controller.get_comments);

// get a specific comment
router.get("/:postid/comments/:commentid", posts_controller.get_comment);

// create a comment
router.post("/:postid/comments", posts_controller.create_comment);

// update a comment
router.put("/:postid/comments/:commentid", posts_controller.update_comment);

// delete a comment
router.delete("/:postid/comments/:commentid", posts_controller.delete_comment);

module.exports = router;
