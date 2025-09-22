const User = require("../models/User");
const { roles } = require("../constants");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const {
  sendSecurityAlertEmail,
  sendAccountDeletionEmail,
  sendOTPEmail,
} = require("../utils/email");
const {
  sendVerificationEmail,
} = require("../controllers/verificationController");

const { publishUserRegisteredEvent } = require("../services/rabbitmq");

exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      phone,
      firstName,
      lastName,
      role = roles.CUSTOMER,
      deviceInfo: deviceInfoFromBody,
    } = req.body;

    // // Validate role assignment
    // if (role === roles.ADMIN && !req.user?.isAdmin) {
    //   return res.status(403).json({ error: "Insufficient permissions" });
    // }

    // REMEMBER TO SWITCH THIS OFF, FOR TESTING ONLY
    const isProduction = process.env.NODE_ENV === "production";
    if (role === roles.ADMIN && isProduction && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Combine firstName and lastName into name
    const name = `${firstName} ${lastName}`.trim();

    const user = await User.create({
      email,
      password,
      phone,
      name,
      role: roles.CUSTOMER, // Use the correct role constant
      emailVerificationOTP: otp,
      emailVerificationOTPExpires: otpExpires,
      emailVerificationOTPAttempts: 0,
    });
    await sendOTPEmail(user.email, otp);
    await user.save();

    // Device and IP info
    const deviceInfo =
      deviceInfoFromBody || req.headers["user-agent"] || "Unknown device";
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "Unknown IP";

    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token with device and IP info
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      userAgent: deviceInfo,
      ipAddress: ip,
    });
    await user.save();

    // Publish event to create profile
    await publishUserRegisteredEvent(user);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.name ? user.name.split(" ")[0] : "",
        lastName: user.name ? user.name.split(" ").slice(1).join(" ") : "",
        phone: user.phone,
        role: user.role,
        is2FAEnabled: user.is2FAEnabled,
        isEmailVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message:
        "Registration successful. Please check your email for the verification code.",
    });
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date(),
    });
    res.status(400).json({
      error: error.message,
      details: error.errors,
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password, twoFAToken } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (user.lockUntil - Date.now()) / (60 * 1000)
      );
      return res.status(403).json({
        error: `Account locked. Try again in ${remainingTime} minutes`,
      });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        error: "Invalid credentials",
        attemptsLeft: 5 - user.loginAttempts,
      });
    }

    // 4. Check if 2FA is enabled
    if (user.is2FAEnabled) {
      // If 2FA token wasn't provided, request it
      if (!twoFAToken) {
        await user.resetLoginAttempts();
        return res.status(206).json({
          // 206 Partial Content
          success: true,
          requires2FA: true,
          message: "2FA token required",
          tempToken: jwt.sign(
            { userId: user._id, purpose: "2fa_verification" },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
          ),
        });
      }

      // Verify the 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: "base32",
        token: twoFAToken,
        window: 1,
      });

      // Check backup codes if primary token failed
      let usedBackupCode = false;
      if (!verified && user.twoFABackupCodes?.length > 0) {
        const backupCodeMatch = user.twoFABackupCodes.find(
          (code) => !code.used && bcrypt.compareSync(twoFAToken, code.code)
        );

        if (backupCodeMatch) {
          backupCodeMatch.used = true;
          backupCodeMatch.usedAt = Date.now();
          usedBackupCode = true;
          verified = true;
        }
      }

      if (!verified) {
        return res.status(403).json({
          error: "Invalid 2FA token",
          requires2FA: true,
        });
      }

      if (usedBackupCode) {
        await user.save(); // Save backup code usage
      }
    }

    // 5. Successful login
    await user.resetLoginAttempts();
    user.lastLogin = Date.now();
    await user.save();

    const deviceInfo =
      req.body.deviceInfo || req.headers["user-agent"] || "Unknown device";
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "Unknown IP";

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Store the refresh token in the user's refreshTokens array with device and IP info
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      userAgent: deviceInfo,
      ipAddress: ip,
    });
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.name ? user.name.split(" ")[0] : "",
        lastName: user.name ? user.name.split(" ").slice(1).join(" ") : "",
        phone: user.phone,
        role: user.role,
        is2FAEnabled: user.is2FAEnabled,
        isEmailVerified: user.isVerified, // This is from OTP verification, not email links
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// // Logout Controller
exports.logout = async (req, res) => {
  try {
    const { refreshToken, allDevices = false } = req.body;

    // Always fetch fresh user document from DB
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify the refresh token belongs to this user
    if (!user.refreshTokens.some((t) => t.token === refreshToken)) {
      // Changed req.user to user
      return res.status(400).json({ error: "Invalid refresh token" });
    }

    if (allDevices) {
      // Logout from all devices
      user.refreshTokens = []; // Changed req.user to user
    } else {
      // Logout from current device only
      user.refreshTokens = user.refreshTokens.filter(
        // Changed req.user to user
        (t) => t.token !== refreshToken
      );
    }

    await user.save(); // Changed req.user to user

    res.json({
      success: true,
      message: allDevices
        ? "Logged out from all devices"
        : "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error); // Added logging
    res.status(500).json({
      success: false,
      error: "Logout failed",
      details: error.message,
    });
  }
};

// Change Password Controller
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Check against password history (prevent reuse)
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        success: false,
        error: "New password must be different from current password",
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();

    // Invalidate all refresh tokens (force logout all devices)
    user.refreshTokens = [];

    await user.save();

    // Send security alert email
    await sendSecurityAlertEmail(user.email, "password-change");

    res.json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Password change failed",
      details: error.message,
    });
  }
};

// Account Deletion Controller
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Password is incorrect",
      });
    }

    // Soft delete (mark as deleted but keep record)
    user.deletedAt = Date.now();
    user.email = `deleted-${user._id}@${user.email.split("@")[1]}`;
    user.status = "deleted";

    // Invalidate all tokens
    user.refreshTokens = [];

    await user.save();

    // Send confirmation email
    await sendAccountDeletionEmail(user.originalEmail);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Account deletion failed",
      details: error.message,
    });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken, deviceInfo: deviceInfoFromBody } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify the refresh token first
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Refresh token expired" });
      }
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Find the token in the user's refreshTokens array
    const tokenDoc = user.refreshTokens.find((t) => t.token === refreshToken);
    if (!tokenDoc) {
      return res.status(401).json({ error: "Refresh token not found" });
    }

    // Check if refresh token has expired
    if (tokenDoc.expires && new Date() > tokenDoc.expires) {
      // Remove expired token
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.token !== refreshToken
      );
      await user.save();
      return res.status(401).json({ error: "Refresh token expired" });
    }

    // Generate new tokens BEFORE removing the old one
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    // Device and IP info
    const deviceInfo =
      deviceInfoFromBody || req.headers["user-agent"] || "Unknown device";
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "Unknown IP";

    // Remove the old refresh token only after successful generation
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== refreshToken
    );

    // Add new refresh token
    user.refreshTokens.push({
      token: newRefreshToken,
      createdAt: new Date(),
      userAgent: deviceInfo,
      ipAddress: ip,
    });

    // Save the user with new tokens
    await user.save();

    // Log successful token refresh
    console.log(`[AUTH] Token refresh successful for user ${user._id}`);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("[AUTH] Token refresh error:", error);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "User already verified." });
    }
    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires) {
      return res.status(400).json({ error: "No OTP set for this user." });
    }
    if (user.emailVerificationOTPAttempts >= 5) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Please request a new code.",
      });
    }
    if (Date.now() > user.emailVerificationOTPExpires) {
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new code." });
    }
    if (user.emailVerificationOTP !== otp) {
      user.emailVerificationOTPAttempts += 1;
      await user.save();
      return res.status(400).json({ error: "Invalid OTP." });
    }
    // Success: verify user (OTP-based verification)
    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    user.emailVerificationOTPAttempts = 0;
    await user.save();
    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "User is already verified." });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new OTP
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpires = otpExpires;
    user.emailVerificationOTPAttempts = 0;
    await user.save();

    // Send new OTP email
    await sendOTPEmail(user.email, otp);

    return res.json({ message: "New verification code sent to your email." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function registerUser(req, res) {
  // ... existing registration logic ...

  // Publish event after successful registration
  await publishEvent("user_registered", {
    userId: newUser._id,
    email: newUser.email,
    timestamp: new Date(),
  });

  res.status(201).json({ message: "User registered" });
}
