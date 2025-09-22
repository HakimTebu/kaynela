// controllers/sessionController.js
const User = require("../models/User");

exports.getSessions = async (req, res) => {
  try {
    const sessions = req.user.refreshTokens.map((token) => ({
      id: token._id,
      issuedAt: token.createdAt,
      expiresAt: token.expires,
      device: token.userAgent || "Unknown device",
      ip: token.ipAddress || "Unknown IP",
      lastActive: token.lastActive || token.createdAt || null, // Always include lastActive
    }));

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: "Failed to retrieve sessions",
    });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    req.user.refreshTokens = req.user.refreshTokens.filter(
      (token) => token._id.toString() !== sessionId
    );

    await req.user.save();

    res.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to revoke session",
    });
  }
};

exports.revokeOtherSessions = async (req, res) => {
  try {
    const currentToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(currentToken, process.env.JWT_SECRET);

    req.user.refreshTokens = req.user.refreshTokens.filter(
      (token) => token.token === decoded.jti
    );

    await req.user.save();

    res.json({
      success: true,
      message: "All other sessions revoked",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to revoke sessions",
    });
  }
};
