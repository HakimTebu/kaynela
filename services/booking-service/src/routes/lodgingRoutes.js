const express = require("express");
const router = express.Router();
const { logAction } = require("../middlewares/audit");

// Placeholder for lodging-specific routes
// These can be expanded later with lodging-specific functionality

router.get("/availability", (req, res) => {
  res.json({
    success: true,
    message: "Lodging availability endpoint - to be implemented",
    requestId: req.requestId,
  });
});

router.get("/types", (req, res) => {
  res.json({
    success: true,
    data: {
      accommodationTypes: [
        "farmhouse",
        "cottage",
        "glamping",
        "camping",
        "guesthouse",
      ],
    },
    requestId: req.requestId,
  });
});

module.exports = router;
