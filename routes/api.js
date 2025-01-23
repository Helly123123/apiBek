const express = require("express");
const router = express.Router();

// Пример маршрута
router.get("/test", (req, res) => {
  res.json({ message: "Hello from the API!" });
});

// Добавьте другие маршруты по мере необходимости

module.exports = router;
