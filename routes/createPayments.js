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
  const token = req.headers["authorization"]?.split(" ")[1];

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
// router.post("/webhooks/yookassa", async (req, res) => {
//   try {
//     console.log("Получен webhook от YooKassa:", req.body);
//     const paymentData = req.body;

//     if (paymentData.event !== "payment.succeeded") {
//       console.log(`Платеж не успешен, статус: ${paymentData.event}`);
//       return res.status(200).send("OK");
//     }

//     const paymentId = paymentData.object.id;
//     const status = paymentData.object.status;

//     console.log(`Обновление платежа: ${paymentId}, новый статус: ${status}`);

//     connection.query(
//       "UPDATE payments SET status = ? WHERE payment_id = ?",
//       [status, paymentId],
//       (err) => {
//         if (err) {
//           console.error("Ошибка при обновлении статуса платежа:", err);
//           return res.status(500).send("Error"); // Notifies that we failed to handle the request
//         }
//         console.log(`Платеж: ${paymentId} статус обновлен`);
//         res.status(200).send("OK");
//       }
//     );
//   } catch (error) {
//     console.error("Ошибка при обработке webhook:", error);
//     res
//       .status(500)
//       .send({ message: error.message || "Ошибка при обработке webhook" });
//   }
// });

module.exports = router;
