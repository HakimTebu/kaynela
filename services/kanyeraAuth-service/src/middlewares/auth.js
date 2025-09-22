const jwt = require("jsonwebtoken");
const User = require("../models/User");

// exports.authenticate = async (req, res, next) => {
//   try {
//     const token = req.header("Authorization")?.replace("Bearer ", "");
//     if (!token) throw new Error("Authentication required");

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.userId);

//     if (!user) throw new Error("User not found");
//     req.user = user;
//     next();
//   } catch (error) {
//     res.status(401).json({ error: error.message });
//   }
// };

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Authentication required");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) throw new Error("User not found");

    // Keep the Mongoose document intact for methods like save()
    req.user = user;
    // Add JWT payload as a separate property
    req.user._jwtPayload = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    next();
  };
};
