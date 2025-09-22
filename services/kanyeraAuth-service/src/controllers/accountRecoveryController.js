const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendAccountRecoveryEmail,
  sendPasswordChangedEmail,
  sendRecoveryCodeEmail,
  sendRecoveryCodeSMS,
} = require("../utils/email");

// Get available recovery methods for a user
exports.getRecoveryMethods = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Security: Don't reveal if user exists
      return res.json({
        success: true,
        methods: [],
        message: "No recovery methods available",
      });
    }

    // Determine available recovery methods
    const methods = [];

    // Email recovery is always available
    methods.push({
      type: "email",
      isAvailable: true,
      isPreferred: true,
      description: "Receive a recovery code via email",
      lastUsed: user.lastEmailRecovery,
    });

    // SMS recovery if phone exists
    if (user.phone) {
      methods.push({
        type: "sms",
        isAvailable: true,
        isPreferred: false,
        description: "Receive a recovery code via text message",
        lastUsed: user.lastSMSRecovery,
      });
    }

    // Security questions if set
    if (user.securityQuestions && user.securityQuestions.length > 0) {
      methods.push({
        type: "security_questions",
        isAvailable: true,
        isPreferred: false,
        description: "Answer your security questions",
        lastUsed: user.lastSecurityQuestionsRecovery,
      });
    }

    // Trusted device if available
    if (user.trustedDevices && user.trustedDevices.length > 0) {
      methods.push({
        type: "trusted_device",
        isAvailable: true,
        isPreferred: false,
        description: "Use a trusted device for recovery",
        lastUsed: user.lastTrustedDeviceRecovery,
      });
    }

    res.json({
      success: true,
      methods,
      message: "Recovery methods retrieved successfully",
    });
  } catch (error) {
    console.error("Get recovery methods error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recovery methods",
    });
  }
};

exports.requestAccountRecovery = async (req, res) => {
  try {
    const { email, recoveryMethod = "email", deviceInfo, ipAddress } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Security: Don't reveal if user exists
      return res.json({
        success: true,
        message: "If an account exists, a recovery email has been sent",
        nextStep: "Check your email for recovery instructions",
        estimatedTime: 5, // minutes
      });
    }

    // Validate recovery method
    const validMethods = ["email", "sms", "security_questions"];
    if (!validMethods.includes(recoveryMethod)) {
      return res.status(400).json({
        success: false,
        error: "Invalid recovery method",
      });
    }

    // Check if method is available for this user
    if (recoveryMethod === "sms" && !user.phone) {
      return res.status(400).json({
        success: false,
        error: "SMS recovery not available for this account",
      });
    }

    if (
      recoveryMethod === "security_questions" &&
      (!user.securityQuestions || user.securityQuestions.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Security questions not available for this account",
      });
    }

    // Generate recovery code (6 digits for SMS, longer for email)
    let recoveryCode, codeExpires;

    if (recoveryMethod === "sms") {
      recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
      codeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes for SMS
    } else {
      recoveryCode = crypto.randomBytes(32).toString("hex");
      codeExpires = Date.now() + 60 * 60 * 1000; // 1 hour for email
    }

    // Store recovery information
    user.accountRecoveryCode = recoveryCode;
    user.accountRecoveryExpires = codeExpires;
    user.accountRecoveryMethod = recoveryMethod;
    user.lastRecoveryAttempt = Date.now();
    user.recoveryAttempts = (user.recoveryAttempts || 0) + 1;

    // Update method-specific timestamps
    if (recoveryMethod === "email") {
      user.lastEmailRecovery = Date.now();
    } else if (recoveryMethod === "sms") {
      user.lastSMSRecovery = Date.now();
    }

    // Store device and IP info for security
    if (deviceInfo) {
      user.lastRecoveryDevice = deviceInfo;
    }
    if (ipAddress) {
      user.lastRecoveryIP = ipAddress;
    }

    await user.save();

    // Send recovery code based on method
    try {
      if (recoveryMethod === "email") {
        await sendRecoveryCodeEmail(user.email, recoveryCode);
      } else if (recoveryMethod === "sms") {
        await sendRecoveryCodeSMS(user.phone, recoveryCode);
      }

      res.json({
        success: true,
        message: `Recovery code sent via ${recoveryMethod}`,
        nextStep: `Enter the code sent to your ${recoveryMethod === "email" ? "email" : "phone"}`,
        estimatedTime: recoveryMethod === "sms" ? 15 : 60,
      });
    } catch (emailError) {
      console.error("Failed to send recovery code:", emailError);
      res.status(500).json({
        success: false,
        error: "Failed to send recovery code",
      });
    }
  } catch (error) {
    console.error("Account recovery error:", error);
    res.status(500).json({
      success: false,
      error: "Account recovery failed",
    });
  }
};

exports.verifyRecoveryToken = async (req, res) => {
  try {
    const { token, method, deviceInfo, ipAddress } = req.body;

    if (!token || !method) {
      return res.status(400).json({
        success: false,
        error: "Recovery code and method are required",
      });
    }

    const user = await User.findOne({
      accountRecoveryCode: token,
      accountRecoveryExpires: { $gt: Date.now() },
      accountRecoveryMethod: method,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired recovery code",
      });
    }

    // Verify method matches
    if (user.accountRecoveryMethod !== method) {
      return res.status(400).json({
        success: false,
        error: "Recovery method mismatch",
      });
    }

    // Check if too many attempts
    if (user.recoveryAttempts > 5) {
      return res.status(429).json({
        success: false,
        error: "Too many recovery attempts. Please try again later.",
      });
    }

    // Generate recovery access token (15 minutes)
    const recoveryAccessToken = jwt.sign(
      {
        userId: user._id,
        purpose: "account_recovery",
        method: method,
        deviceInfo: deviceInfo || user.lastRecoveryDevice,
        ipAddress: ipAddress || user.lastRecoveryIP,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Clear recovery code after successful verification
    user.accountRecoveryCode = undefined;
    user.accountRecoveryExpires = undefined;
    user.accountRecoveryMethod = undefined;
    await user.save();

    res.json({
      success: true,
      data: {
        recoveryAccessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
      message: "Recovery code verified successfully",
    });
  } catch (error) {
    console.error("Recovery verification error:", error);
    res.status(500).json({
      success: false,
      error: "Recovery verification failed",
    });
  }
};

exports.completeAccountRecovery = async (req, res) => {
  try {
    // Verify this is a recovery token
    if (req.user._jwtPayload?.purpose !== "account_recovery") {
      return res.status(401).json({
        success: false,
        error: "Invalid token purpose",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const { newPassword, confirmPassword, securityQuestions, enable2FA } =
      req.body;

    // Validate password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    // Update password and reset account
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Clear all recovery-related fields
    user.accountRecoveryCode = undefined;
    user.accountRecoveryExpires = undefined;
    user.accountRecoveryMethod = undefined;
    user.recoveryAttempts = 0;

    // Terminate all existing sessions for security
    user.refreshTokens = [];

    // Update security questions if provided
    if (securityQuestions && securityQuestions.length > 0) {
      user.securityQuestions = securityQuestions;
    }

    // Enable 2FA if requested
    if (enable2FA) {
      user.is2FAEnabled = true;
    }

    await user.save();

    // Send confirmation email
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (emailError) {
      console.error("Failed to send password change email:", emailError);
    }

    // Log security event
    console.log(
      `Account recovery completed for user: ${user.email} from IP: ${req.user._jwtPayload.ipAddress}`
    );

    res.json({
      success: true,
      message: "Account recovered successfully",
      nextSteps: [
        "Sign in with your new password",
        "Enable two-factor authentication for extra security",
        "Review your account settings",
        "Update your recovery information",
      ],
    });
  } catch (error) {
    console.error("Account recovery completion error:", error);
    res.status(500).json({
      success: false,
      error: "Account recovery failed",
    });
  }
};
