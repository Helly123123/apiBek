const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");
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

// Функция для получения userId по токену
const getUserIdFromToken = async (token) => {
  const uuid = await getUserIdByToken(token);

  return new Promise((resolve, reject) => {
    const query = "SELECT id FROM users WHERE token = ?";
    connection.query(query, [uuid], (err, results) => {
      if (err) {
        return reject(err);
      }

      if (results.length > 0) {
        console.log(results[0].id);
        resolve(results[0].id); // Возвращаем id пользователя
      } else {
        // Пользователь не найден, добавляем его
        const insertQuery = "INSERT INTO users (username, token) VALUES (?, ?)";
        connection.query(insertQuery, [uuid, token], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results.insertId); // Возвращаем id нового пользователя
        });
      }
    });
  });
};

// Маршрут для получения списка платежей
router.get("/paymentsList", async (req, res) => {
  const token = req.headers.authorization; // получаем токен
  console.log(token);

  if (!token) {
    return res.status(401).json({ message: "Токен не предоставлен" });
  }

  try {
    // Получаем userId на основе токена
    const userId = await getUserIdFromToken(token); // Используем await для получения числа
    console.log(userId);

    // Запрос для получения списка платежей
    const selectPaymentsQuery = `
      SELECT p.id, p.user_id, p.payment_method, p.amount, p.currency, p.payment_id, p.status, p.created_at, u.username
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `;

    // Выполняем запрос и возвращаем результаты
    connection.query(selectPaymentsQuery, [userId], (err, results) => {
      if (err) {
        console.error("Ошибка при получении данных о платежах:", err);
        return res.status(500).send({ message: "Ошибка при получении данных" });
      }

      // Успешное получение данных
      return res.status(200).json(results);
    });
  } catch (error) {
    console.error("Ошибка:", error);
    return res.status(500).json({ message: error.message });
  }
});

// Экспорт маршрутизатора
module.exports = router;
