require("dotenv").config();

// services/auth-service/src/server.js
const https = require("https");
const fs = require("fs");
const app = require("./app");

const options = {
  key: fs.readFileSync("path/to/privkey.pem"),
  cert: fs.readFileSync("path/to/fullchain.pem"),
};

https.createServer(options, app).listen(443);
