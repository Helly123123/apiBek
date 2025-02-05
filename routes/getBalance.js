const express = require("express");
const axios = require("axios");
const connection = require("../db");
const router = express.Router();

const getUserIdByToken = async (token) => {
  try {
    const response = await axios.post(
      "https://b2288.apitter.com/instances/getUserUuid",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(response.data.uuid, "uuid");
    return response.data.uuid;
  } catch (error) {
    console.error("Ошибка при получении UUID:", error);
    throw new Error("Ошибка при получении UUID");
  }
};

// Эндпоинт для получения суммы платежей
router.post("/api/get-payment-sum", async (req, res) => {
  const token = req.body.token; // Предполагаем, что токен передается в теле запроса

  if (!token) {
    return res.status(400).send("Токен не предоставлен");
  }

  try {
    const userId = await getUserIdByToken(token);

    // Запрос для получения суммы платежей
    const [rows] = await connection
      .promise()
      .query(
        "SELECT SUM(amount) AS totalAmount FROM payments WHERE user_id = ?",
        [userId]
      );

    const totalAmount = rows[0].totalAmount || 0; // Если нет платежей, возвращаем 0
    res.json({ totalAmount });
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    res.status(500).send("Ошибка при обработке запроса");
  }
});

module.exports = router;
