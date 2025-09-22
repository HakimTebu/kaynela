// userRoutes.js (new file for user-related endpoints)
const router = require("express").Router();
const { body } = require("express-validator");
const { authenticate } = require("../middlewares/auth");
const User = require("../models/User");

// Get user profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    // Support userId, _id, or id
    const userId = req.user._id || req.user.userId || req.user.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID not found in token",
      });
    }

    // Always select loyaltyPoints and loyaltyTier, and use lean for performance
    let user = await User.findById(userId)
      .select("-password -refreshTokens -__v")
      .lean();

    // Ensure these fields are always present
    user.loyaltyPoints = user.loyaltyPoints ?? 0;
    user.loyaltyTier = user.loyaltyTier ?? "bronze";

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch profile",
    });
  }
});

// Update user profile
router.patch(
  "/profile",
  authenticate,
  [
    body("name").optional().trim().escape(),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("Invalid phone number"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
  ],
  async (req, res) => {
    try {
      const updates = Object.keys(req.body);
      const allowedUpdates = ["name", "phone", "avatar"];
      const isValidOperation = updates.every((update) =>
        allowedUpdates.includes(update)
      );

      if (!isValidOperation) {
        return res.status(400).json({
          success: false,
          error: "Invalid updates!",
        });
      }

      updates.forEach((update) => {
        req.user[update] = req.body[update];
      });

      await req.user.save();

      res.json({
        success: true,
        data: req.user,
        message: "Profile updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Update failed",
        details: error.message,
      });
    }
  }
);

module.exports = router;
