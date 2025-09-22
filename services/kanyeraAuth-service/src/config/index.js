require("dotenv").config();

module.exports = {
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
};
