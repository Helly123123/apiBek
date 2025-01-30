const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const connection = require("../db"); // Импортируйте вашу конфигурацию базы данных
const crypto = require("crypto");

const SHOP_ID = "437408";
const SECRET_KEY = "test_xB5ui4r1OPr3Sc-WZ-dMgcre2uRzjZ2tFbuoM276wTs";

const router = express.Router();

const getBasicAuthHeader = (shopId, secretKey) => {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
};

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
    console.log(response.data.uuid, "uiud");
    return response.data.uuid;
  } catch (error) {
    console.error("Ошибка при получении UUID:", error);
    throw new Error("Ошибка при получении UUID");
  }
};

router.post("/api/create_payment", async (req, res) => {
  console.log("Запрос на создание платежа:", req.body);

  const { amount, currency } = req.body;
  let token = req.headers["authorization"];

  if (!token) {
    console.log("Ошибка: Токен не найден в заголовке Authorization");
    return res
      .status(400)
      .send({ message: "Необходимы параметры amount, currency и token" });
  }
  token = token.split(" ")[1];

  if (!amount || !currency || !token) {
    console.log("Ошибка: Необходимы параметры amount, currency и token");
    return res
      .status(400)
      .send({ message: "Необходимы параметры amount, currency и token" });
  }

  try {
    const uuid = await getUserIdByToken(token);

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: {
          value: amount,
          currency: currency,
        },
        confirmation: {
          type: "redirect",
          return_url: "https://your-return-url.com",
        },
        capture: true,
        description: "Payment description",
      },
      {
        headers: {
          Authorization: getBasicAuthHeader(SHOP_ID, SECRET_KEY),
          "Content-Type": "application/json",
          "Idempotence-Key": uuidv4(),
        },
      }
    );

    const paymentId = response.data.id;
    const status = response.data.status;
    const link = response.data.confirmation.confirmation_url;

    console.log(`Платеж успешно создан: ${paymentId}, статус: ${status}`);

    connection.query(
      "INSERT INTO payments (user_id, payment_method, amount, currency, payment_id, status) VALUES (?, ?, ?, ?, ?, ?)",
      [uuid, "YooKassa", amount, currency, paymentId, status],
      (err) => {
        if (err) {
          console.error("Ошибка при сохранении платежа:", err);
          return res
            .status(500)
            .send({ message: "Ошибка при сохранении платежа" });
        }

        res.status(200).json({
          message: "Платеж успешно создан",
          link: link,
        });
      }
    );
  } catch (error) {
    console.error("Ошибка при создании платежа:", error);
    res
      .status(500)
      .send({ message: error.message || "Ошибка при создании платежа" });
  }
});

router.post(
  "https://hellylo.apitter.com:3000/webhooks/yookassa",
  async (req, res) => {
    console.log("Получен webhook от YooKassa:", req.body);

    try {
      const paymentId = req.body.object.id;
      const status = req.body.object.status;

      if (!paymentId || !status) {
        console.error("Ошибка: Не найден paymentId или status в webhook");
        return res
          .status(400)
          .json({ message: "Не найден paymentId или status" });
      }

      console.log(`YooKassa paymentId: ${paymentId}, status: ${status}`);

      const selectPaymentQuery = `
        SELECT user_id
        FROM payments
        WHERE payment_id = ?
      `;

      connection.query(
        selectPaymentQuery,
        [paymentId],
        async (err, results) => {
          if (err) {
            console.error("Ошибка при получении user_id из базы данных:", err);
            return res
              .status(500)
              .json({ message: "Ошибка при получении user_id" });
          }

          if (results.length === 0) {
            console.error(
              "Ошибка: Платеж с данным paymentId не найден в базе данных"
            );
            return res.status(404).json({ message: "Платеж не найден" });
          }
          const userId = results[0].user_id;
          console.log("userId from db", userId);

          const updatePaymentQuery = `
              UPDATE payments
              SET status = ?
              WHERE payment_id = ?
          `;

          connection.query(
            updatePaymentQuery,
            [status, paymentId],
            (err, updateResult) => {
              if (err) {
                console.error("Ошибка при обновлении статуса платежа:", err);
                return res
                  .status(500)
                  .json({ message: "Ошибка при обновлении статуса платежа" });
              }
              console.log(
                `Платеж ${paymentId} обновлен успешно. Новый статус: ${status}`
              );
              res
                .status(200)
                .json({ message: "Статус платежа успешно обновлен" });
            }
          );
        }
      );
    } catch (error) {
      console.error("Ошибка при обработке webhook:", error);
      res.status(500).json({ message: "Ошибка при обработке webhook" });
    }
  }
);

module.exports = router;
