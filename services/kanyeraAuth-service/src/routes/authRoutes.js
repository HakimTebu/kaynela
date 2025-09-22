const express = require("express");
const { body } = require("express-validator");
const router = require("express").Router();
const passport = require("passport");

const {
  getSessions,
  revokeSession,
  revokeOtherSessions,
} = require("../controllers/sessionController");

const {
  setup2FA,
  verify2FA,
  disable2FA,
  getBackupCodes,
  regenerateBackupCodes,
} = require("../controllers/twoFAController");

const {
  register,
  login,
  refreshToken,
  logout,
  changePassword,
  deleteAccount,
  verifyOTP,
  resendOTP,
} = require("../controllers/authController");
const {
  sendVerificationEmail,
  verifyEmail,
} = require("../controllers/verificationController");
const {
  requestPasswordReset,
  resetPassword,
} = require("../controllers/passwordController");
const {
  googleLogin,
  handleGoogleCallback,
} = require("../controllers/googleAuthController");
const { authenticate } = require("../middlewares/auth");
const { logAction } = require("../middlewares/audit");
const {
  apiLimiter,
  authLimiter,
  progressiveAuthLimiter,
  passwordResetLimiter,
  otpLimiter,
} = require("../middlewares/rateLimiter");
const { validate } = require("../middlewares/validate");

// Session Management
router.get("/sessions", authenticate, getSessions);
router.delete("/sessions/:sessionId", authenticate, revokeSession);
router.delete("/sessions/others", authenticate, revokeOtherSessions);

// 2FA Endpoints
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/verify", authenticate, verify2FA);
router.post("/2fa/disable", authenticate, disable2FA);
router.get("/2fa/backup-codes", authenticate, getBackupCodes);
router.post(
  "/2fa/backup-codes/regenerate",
  authenticate,
  regenerateBackupCodes
);

// REGISTER USER
router.post(
  "/register",
  apiLimiter,
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ]),
  register
);
router.post(
  "/login",
  authLimiter,
  progressiveAuthLimiter,
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
    body("deviceInfo").optional().isString(),
  ]),
  login,
  logAction("login")
);
router.post("/refresh-token", refreshToken);

// Google OAuth routes
router.get(
  "/google",
  apiLimiter,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// GOOGLE CALLBACK
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  handleGoogleCallback,
  logAction("google_login")
);

// Alternative token-based Google auth (for mobile apps)
router.post("/google-auth", apiLimiter, googleLogin);

// EMAIL VERIFICATION
// router.post("/verify-email", verifyEmail);
router.post("/verify-email", (req, res) => verifyEmail(req, res));

// RESEND EMAIL VERIFICATION
// router.post("/resend-verification", authenticate, sendVerificationEmail);
router.post("/resend-verification", authenticate, async (req, res) => {
  try {
    // req.user is now a proper Mongoose document
    await sendVerificationEmail(req.user);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REQUEST PASSWORD RESET
router.post(
  "/request-password-reset",
  passwordResetLimiter,
  requestPasswordReset
);

// PASSWORD RESET
router.post("/reset-password", passwordResetLimiter, resetPassword);

// PROFILE
router.get("/me", authenticate, (req, res) => {
  res.json(req.user);
});

// HEALTH CHECK
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Logout Route
router.post(
  "/logout",
  authenticate,
  [
    body("refreshToken").notEmpty().withMessage("Refresh token is required"),
    body("allDevices").optional().isBoolean(),
  ],
  logAction("logout"),
  logout
);

// Change Password Route
router.post(
  "/change-password",
  verify2FA,
  authenticate,
  authLimiter,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 12 })
      .withMessage("Password must be at least 12 characters")
      .matches(/[0-9]/)
      .withMessage("Password must contain a number")
      .matches(/[a-z]/)
      .withMessage("Password must contain a lowercase letter")
      .matches(/[A-Z]/)
      .withMessage("Password must contain an uppercase letter")
      .matches(/[^a-zA-Z0-9]/)
      .withMessage("Password must contain a special character"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords do not match"),
  ],
  logAction("password_change"),
  changePassword
);

// Account Deletion Route
router.delete(
  "/account",
  authenticate,
  apiLimiter,
  [
    body("password")
      .notEmpty()
      .withMessage("Password is required for verification"),
  ],
  logAction("account_deletion"),
  deleteAccount
);

// OTP VERIFICATION
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);

module.exports = router;
