// 2FA Verification Middleware
const verify2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (user.is2FAEnabled && !req.user.is2FAVerified) {
      return res.status(403).json({
        success: false,
        error: "2FA verification required",
        requires2FA: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};


