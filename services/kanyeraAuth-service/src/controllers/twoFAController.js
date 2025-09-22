// controllers/twoFAController.js
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `${req.user.email} (${process.env.APP_NAME})`,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    req.user.temp2FASecret = secret.base32;
    await req.user.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCodeUrl,
        manualEntryCode: secret.otpauth_url,
      },
      message: "Scan QR code with authenticator app",
    });
  } catch (error) {
    console.error("2FA Setup Error:", error); // Add this line
    res.status(500).json({
      success: false,
      error: "2FA setup failed",
    });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!req.user.temp2FASecret) {
      return res.status(400).json({
        success: false,
        error: "2FA setup not initiated",
      });
    }

    // Add window for time drift (2 cycles = 1 minute)
    const verified = speakeasy.totp.verify({
      secret: req.user.temp2FASecret,
      encoding: "base32",
      token: req.body.token,
      window: 6, // Accepts current + previous 2 codes
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification token",
      });
    }

    req.user.twoFASecret = req.user.temp2FASecret;
    req.user.temp2FASecret = undefined;
    req.user.is2FAEnabled = true;

    const backupCodes = Array.from({ length: 5 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    req.user.twoFABackupCodes = backupCodes.map((code) => ({
      code: bcrypt.hashSync(code, 10),
      used: false,
    }));

    await req.user.save();

    res.json({
      success: true,
      data: { backupCodes },
      message: "2FA enabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "2FA verification failed",
    });
  }
};

exports.disable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!req.user.is2FAEnabled) {
      return res.status(400).json({
        success: false,
        error: "2FA is not enabled",
      });
    }

    const verified = speakeasy.totp.verify({
      secret: req.user.twoFASecret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification token",
      });
    }

    req.user.twoFASecret = undefined;
    req.user.is2FAEnabled = false;
    req.user.twoFABackupCodes = [];

    await req.user.save();

    res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to disable 2FA",
    });
  }
};

exports.getBackupCodes = async (req, res) => {
  try {
    // Check if 2FA is enabled
    if (!req.user.is2FAEnabled) {
      return res.status(403).json({
        success: false,
        error: "2FA is not enabled",
        code: "2FA_NOT_ENABLED",
        message:
          "Two-factor authentication must be enabled to access backup codes",
      });
    }

    // Check if backup codes exist
    if (!req.user.twoFABackupCodes || req.user.twoFABackupCodes.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No backup codes found",
        code: "NO_BACKUP_CODES",
        message: "No backup codes are available for this account",
      });
    }

    // Return the backup codes that haven't been used
    const unusedBackupCodes = req.user.twoFABackupCodes
      .filter((backupCode) => !backupCode.used)
      .map((backupCode, index) => ({
        id: index + 1,
        used: backupCode.used,
        usedAt: backupCode.usedAt,
      }));

    res.json({
      success: true,
      data: {
        backupCodes: unusedBackupCodes,
        totalCodes: req.user.twoFABackupCodes.length,
        unusedCodes: unusedBackupCodes.length,
      },
    });
  } catch (error) {
    console.error("Error getting backup codes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve backup codes",
      code: "INTERNAL_ERROR",
    });
  }
};

exports.regenerateBackupCodes = async (req, res) => {
  try {
    if (!req.user.is2FAEnabled) {
      return res.status(400).json({
        success: false,
        error: "2FA is not enabled",
      });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 5 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    req.user.twoFABackupCodes = backupCodes.map((code) => ({
      code: bcrypt.hashSync(code, 10),
      used: false,
    }));

    await req.user.save();

    res.json({
      success: true,
      data: { backupCodes },
      message: "Backup codes regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating backup codes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to regenerate backup codes",
    });
  }
};
