const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const connection = require("../db");
const crypto = require("crypto");

const SHOP_ID = "437408";
const SECRET_KEY = "test_xB5ui4r1OPr3Sc-WZ-dMgcre2uRzjZ2tFbuoM276wTs";
const webhookUrl = "https://hellylo.apitter.com/webhooks/yookassa";

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

// Функция для создания вебхука
const createYookassaWebhook = async () => {
  try {
    const response = await axios.post(
      "https://api.yookassa.ru/v3/webhooks",
      {
        event: "payment.succeeded",
        url: webhookUrl,
      },
      {
        headers: {
          Authorization: getBasicAuthHeader(SHOP_ID, SECRET_KEY),
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Вебхук YooKassa успешно создан:", response.data);
    return { success: true };
  } catch (error) {
    console.error("Ошибка при создании вебхука:", error);
    return { success: false, error: error.message || error };
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
      async (err) => {
        if (err) {
          console.error("Ошибка при сохранении платежа:", err);
          return res
            .status(500)
            .send({ message: "Ошибка при сохранении платежа" });
        }

        // Вызываем создание вебхука
        const webhookResult = await createYookassaWebhook();
        if (webhookResult.success) {
          console.log("Вебхук успешно создан после платежа");
          res.status(200).json({
            message: "Платеж успешно создан",
            link: link,
          });
        } else {
          console.error(
            "Ошибка при создании вебхука после платежа",
            webhookResult.error
          );
          res.status(200).json({
            message: "Платеж успешно создан, но вебхук не был создан",
            link: link,
            webhookError: webhookResult.error,
          });
        }
      }
    );
  } catch (error) {
    console.error("Ошибка при создании платежа:", error);
    res
      .status(500)
      .send({ message: error.message || "Ошибка при создании платежа" });
  }
});

module.exports = router;
