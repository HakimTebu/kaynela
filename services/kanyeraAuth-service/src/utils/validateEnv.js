// services/auth-service/src/utils/validateEnv.js
module.exports = () => {
  const requiredVars = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "BASE_URL",
    "GOOGLE_CALLBACK_URL",
  ];

  requiredVars.forEach((variable) => {
    if (!process.env[variable]) {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  });
};
