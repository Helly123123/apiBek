const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // Импортируем библиотеку для генерации UUID

const app = express();
const PORT = process.env.PORT || 3000;

// Используйте CORS
app.use(cors());
app.use(bodyParser.json());

const SHOP_ID = "437408"; // Замените на ваш shopID
const SECRET_KEY = "test_xB5ui4r1OPr3Sc-WZ-dMgcre2uRzjZ2tFbuoM276wTs"; // Ваш секретный ключ

// Функция для получения заголовка Basic авторизации
const getBasicAuthHeader = (shopId, secretKey) => {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
};

// Маршрут для создания платежа
app.post("/api/create_payment", async (req, res) => {
  const { amount, currency } = req.body;

  // Проверка входных данных
  if (!amount || !currency) {
    return res
      .status(400)
      .send({ message: "Необходимы параметры amount и currency" });
  }

  try {
    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: {
          value: amount,
          currency: currency,
        },
        confirmation: {
          type: "redirect",
          return_url: "https://your-return-url.com", // Замените на ваш URL
        },
        capture: true,
        description: "Payment description",
      },
      {
        headers: {
          Authorization: getBasicAuthHeader(SHOP_ID, SECRET_KEY), // Используем Basic авторизацию
          "Content-Type": "application/json",
          "Idempotence-Key": uuidv4(), // Генерируем уникальный идемпотентный ключ
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      "Ошибка при создании платежа:",
      error.response ? error.response.data : error.message
    );
    res.status(error.response ? error.response.status : 500).send({
      message: error.response
        ? error.response.data
        : "Внутренняя ошибка сервера",
    });
  }
});

// Новый маршрут для получения списка всех оплат
app.get("/api/payments", async (req, res) => {
  try {
    const response = await axios.get("https://api.yookassa.ru/v3/payments", {
      headers: {
        Authorization: getBasicAuthHeader(SHOP_ID, SECRET_KEY), // Используем Basic авторизацию
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(
      "Ошибка при получении списка платежей:",
      error.response ? error.response.data : error.message
    );
    res.status(error.response ? error.response.status : 500).send({
      message: error.response
        ? error.response.data
        : "Внутренняя ошибка сервера",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
