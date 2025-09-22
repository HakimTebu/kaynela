// authMiddleware.js
const User = require("../models/User");
const speakeasy = require("speakeasy");
const bcrypt = require("bcryptjs");

exports.verify2FA = async (req, res, next) => {
  try {
    // Skip 2FA verification if user doesn't have it enabled
    if (!req.user.is2FAEnabled) {
      return next();
    }

    // Check if 2FA was already verified in this session
    if (req.user.is2FAVerified) {
      return next();
    }

    // Check for 2FA token in header
    const twoFAToken = req.headers["x-2fa-token"] || req.body.twoFAToken;

    if (!twoFAToken) {
      return res.status(403).json({
        success: false,
        error: "2FA token required",
        requires2FA: true,
        is2FAEnabled: true,
      });
    }

    const user = await User.findById(req.user._id);

    // Verify the token
    let verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: twoFAToken,
      window: 1, // Allows 1 token before/after current for time drift
    });

    // Check backup codes if primary token failed
    if (!verified && user.twoFABackupCodes?.length > 0) {
      const backupCodeMatch = user.twoFABackupCodes.find(
        (code) => !code.used && bcrypt.compareSync(twoFAToken, code.code)
      );

      if (backupCodeMatch) {
        backupCodeMatch.used = true;
        backupCodeMatch.usedAt = Date.now();
        await user.save();
        verified = true;
      }
    }

    if (!verified) {
      return res.status(403).json({
        success: false,
        error: "Invalid 2FA token",
        requires2FA: true,
      });
    }

    // Mark 2FA as verified for this session
    req.user.is2FAVerified = true;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "2FA verification failed",
    });
  }
};
