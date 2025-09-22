const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { sendVerificationEmail } = require("../utils/email"); // Changed import

exports.sendVerificationEmail = async (user) => {
  const token = crypto.randomBytes(20).toString("hex");

  // user.emailVerificationToken = token;
  // user.emailVerificationExpires = Date.now() + 24 * 3600 * 1000;
  // await user.save();

  // Fetch the user from the database to get the Mongoose document
  const dbUser = await User.findById(user._id);

  if (!dbUser) {
    throw new Error("User not found");
  }

  dbUser.emailVerificationToken = token;
  dbUser.emailVerificationExpires = Date.now() + 24 * 3600 * 1000;
  await dbUser.save(); // Now this works

  const verificationUrl = `${process.env.PORT}/verify-email?token=${token}`;

  await sendVerificationEmail(user.email, verificationUrl);
};

exports.verifyEmail = async (req, res) => {
  const user = await User.findOne({
    emailVerificationToken: req.query.token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Email verified successfully" });
};
