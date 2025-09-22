const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const accountRecoveryController = require("../controllers/accountRecoveryController");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { authenticate } = require("../middlewares/auth");

// Get available recovery methods for a user
router.get(
  "/recover/methods",
  apiLimiter,
  [query("email").isEmail().normalizeEmail()],
  accountRecoveryController.getRecoveryMethods
);

// Request account recovery
router.post(
  "/recover",
  apiLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("recoveryMethod")
      .isIn(["email", "sms", "security_questions"])
      .optional(),
    body("deviceInfo").optional().isString(),
    body("ipAddress").optional().isIP(),
  ],
  accountRecoveryController.requestAccountRecovery
);

// Verify recovery token
router.post(
  "/recover/verify",
  apiLimiter,
  [
    body("token").notEmpty().withMessage("Recovery code is required"),
    body("method")
      .isIn(["email", "sms", "security_questions"])
      .withMessage("Valid recovery method is required"),
    body("deviceInfo").optional().isString(),
    body("ipAddress").optional().isIP(),
  ],
  accountRecoveryController.verifyRecoveryToken
);

// Complete account recovery
router.post(
  "/recover/complete",
  apiLimiter,
  authenticate, // Uses the recoveryAccessToken
  [
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords do not match"),
    body("securityQuestions").optional().isArray(),
    body("enable2FA").optional().isBoolean(),
  ],
  accountRecoveryController.completeAccountRecovery
);

module.exports = router;
