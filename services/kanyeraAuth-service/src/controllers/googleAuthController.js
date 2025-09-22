

const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.handleGoogleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Google authentication failed" });
    }

    // Find or create user
    let user = await User.findOne({ email: req.user.email });

    if (!user) {
      user = await User.create({
        email: req.user.email,
        name: req.user.displayName,
        avatar: req.user.picture,
        isVerified: true,
        provider: "google",
        googleId: req.user.id,
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Redirect with tokens (or set cookies)
    res.redirect(
      `${process.env.PORT}/oauth?access=${accessToken}&refresh=${refreshToken}`
    );
  } catch (error) {
    next(error);
  }
};

// For mobile/token-based auth
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    // Verify Google token and handle similarly to callback
    // ... implementation similar to handleGoogleCallback
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};