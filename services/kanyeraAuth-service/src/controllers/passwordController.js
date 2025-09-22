const crypto = require("crypto");
const User = require("../models/User");
const {
  sendAccountRecoveryEmail,
  sendPasswordChangedEmail,
} = require("../utils/email");
const validator = require("validator");

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link was sent",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = Date.now() + 3600000; // 1 hour

    // Use findOneAndUpdate to ensure atomic update
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt, 
        },
      },
      { new: true } // Return the updated document
    );

    console.log("Updated user:", {
      token: updatedUser.resetPasswordToken,
      expires: updatedUser.resetPasswordExpires,
      email: updatedUser.email,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendAccountRecoveryEmail(user.email, resetUrl);

    return res.json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Reset error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to process password reset",
      systemError:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: "Token and password are required",
        details: {
          received: { token: !!token, password: !!password },
        },
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      // More detailed error reporting
      const exists = await User.exists({ resetPasswordToken: token });
      return res.status(400).json({
        error: "Invalid or expired token",
        details: {
          tokenExists: exists,
          currentTime: new Date(),
          token: token.substring(0, 10) + "...", // Partial token for debugging
        },
      });
    }

    // Update password and clear token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    // Send confirmation
    await sendPasswordChangedEmail(user.email);

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password reset error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to reset password",
      systemError:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};