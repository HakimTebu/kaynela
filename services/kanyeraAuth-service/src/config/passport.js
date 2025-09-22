// // services/auth-service/src/config/passport.js
// require("dotenv").config();
// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const User = require("../models/User");

// // Only one strategy configuration
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `${process.env.BASE_URL}${process.env.GOOGLE_CALLBACK_URL}`,
//       passReqToCallback: true,
//     },
//     async (req, accessToken, refreshToken, profile, done) => {
//       try {
//         let user = await User.findOne({
//           $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
//         });

//         if (!user) {
//           user = await User.create({
//             googleId: profile.id,
//             email: profile.emails[0].value,
//             name: profile.displayName,
//             avatar: profile.photos[0]?.value,
//             isVerified: true,
//             provider: "google",
//           });
//         } else if (!user.googleId) {
//           user.googleId = profile.id;
//           await user.save();
//         }

//         return done(null, user);
//       } catch (err) {
//         return done(err, null);
//       }
//     }
//   )
// );

// // Serialization (only once)
// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// module.exports = passport; // Don't forget to export!


// services/auth-service/src/config/passport.js
require('dotenv').config();
const passport = require('passport');
const configureGoogleStrategy = require('./googleStrategy');

// Initialize strategies
configureGoogleStrategy(passport);

// Serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;