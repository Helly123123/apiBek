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
    console.log(response.data.uuid);
    return response.data.uuid; // Возвращаем UUID
  } catch (error) {
    console.error("Ошибка при получении UUID:", error);
    throw new Error("Ошибка при получении UUID"); // Пробрасываем ошибку дальше
  }
};

router.get("/api/paymentsList", async (req, res) => {
  const authHeader = req.headers["authorization"];
  let token;
  console.log("Полный заголовок Authorization:", authHeader);

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
      console.log("Токен:", token);
    } else {
      console.log("Ошибка: Некорректный формат токена");
      return res.status(401).json({ message: "Некорректный формат токена" });
    }
  } else {
    console.log("Ошибка: Токен не предоставлен");
    return res.status(401).json({ message: "Токен не предоставлен" });
  }

  if (!token) {
    return res.status(401).json({ message: "Токен не предоставлен" });
  }

  try {
    // Получаем uuid на основе токена
    const uuid = await getUserIdByToken(token);
    console.log("UUID:", uuid);

    // Запрос для получения списка платежей
    const selectPaymentsQuery = `
        SELECT id, user_id, payment_method, amount, currency, payment_id, status, created_at
        FROM payments
        WHERE user_id = ?
      `;
    connection.query(selectPaymentsQuery, [uuid], (err, results) => {
      if (err) {
        console.error("Ошибка при получении данных о платежах:", err);
        return res.status(500).send({ message: "Ошибка при получении данных" });
      }
      return res.status(200).json(results);
    });
  } catch (error) {
    console.error("Ошибка:", error);
    return res.status(500).json({ message: error.message });
  }
});

// Метод для получения суммы платежей
router.post("/api/get-payment-sum", async (req, res) => {
  const authHeader = req.headers.authorization; // Получаем заголовок авторизации

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Токен не предоставлен или неверен" });
  }

  const token = authHeader.split(" ")[1]; // Извлекаем токен из заголовка

  try {
    const uuid = await getUserIdByToken(token); // Получаем user_id из токена

    const selectPaymentsQuery = `
      SELECT SUM(amount) AS totalAmount
      FROM payments
      WHERE user_id = ?
    `;

    connection
      .promise()
      .query(selectPaymentsQuery, [uuid])
      .then(([results]) => {
        if (results[0].totalAmount) {
          return res.status(200).json({ totalAmount: results[0].totalAmount });
        } else {
          return res.status(200).json({ totalAmount: 0 });
        }
      })
      .catch((err) => {
        console.error("Ошибка при получении суммы платежей:", err);
        return res.status(500).send({ message: "Ошибка при получении данных" });
      });
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;
