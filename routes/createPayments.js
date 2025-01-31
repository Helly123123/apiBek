const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const connection = require("../db"); // Импортируйте вашу конфигурацию базы данных
const crypto = require("crypto");

const SHOP_ID = "437408";
const SECRET_KEY = "test_xB5ui4r1OPr3Sc-WZ-dMgcre2uRzjZ2tFbuoM276wTs";
const webhookUrl = "https://your-domain.com/webhooks/yookassa";

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

router.post("/webhooks/yookassa", async (req, res) => {
  try {
    console.log("Получен вебхук от YooKassa:", req.body);
    const event = req.body;
    const eventType = event.event;
    const payment = event.object;

    if (payment) {
      const paymentId = payment.id;
      const status = payment.status;

      // Проверка подписи вебхука (важно для безопасности!)
      // const signature = req.headers["x-request-signature"];
      // if (!signature || !verifyWebhookSignature(event, signature)) {
      //   console.error("Неверная подпись вебхука!");
      //   return res.status(401).send({ message: "Неверная подпись вебхука" });
      // }

      // Обновление статуса платежа в базе данных
      await updatePaymentStatus(paymentId, status);

      res.status(200).send({ message: "Вебхук обработан" });
    } else {
      console.error("Некорректный формат вебхука!");
      res.status(400).send({ message: "Некорректный формат вебхука" });
    }
  } catch (error) {
    console.error("Ошибка при обработке вебхука:", error);
    res.status(500).send({ message: "Ошибка при обработке вебхука" });
  }
});

const verifyWebhookSignature = (event, signature) => {
  // Замените 'YOUR_SECRET_KEY' на ваш секретный ключ из настроек ЮKassa
  const secretKey = SECRET_KEY;
  const computedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(JSON.stringify(event))
    .digest("hex");
  return computedSignature === signature;
};

const updatePaymentStatus = async (paymentId, status) => {
  try {
    // Найдите запись в базе данных по paymentId
    const [rows] = await connection
      .promise()
      .query("SELECT * FROM payments WHERE payment_id = ?", [paymentId]);
    if (rows.length === 0) {
      console.warn(`Платеж с ID ${paymentId} не найден в базе данных`);
      return;
    }
    const payment = rows[0];
    // Обновите запись в базе данных
    await connection
      .promise()
      .query("UPDATE payments SET status = ? WHERE payment_id = ?", [
        status,
        paymentId,
      ]);
    console.log(`Статус платежа ${paymentId} обновлен на ${status}`);
  } catch (error) {
    console.error("Ошибка при обновлении статуса платежа:", error);
  }
};

module.exports = router;
