const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const db = require("./db");
const { v4: uuidv4 } = require("uuid");
const paymentRoutes = require("./routes/createPayments");
const createUserRoutes = require("./routes/createUser");
const getPaymentsList = require("./routes/getPaymentsList");

const app = express();

// Настройка CORS
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());
app.use(paymentRoutes);
app.use(createUserRoutes);
app.use(getPaymentsList);
const SHOP_ID = "437408";
const SECRET_KEY = "test_xB5ui4r1OPr3Sc-WZ-dMgcre2uRzjZ2tFbuoM276wTs";

const getBasicAuthHeader = (shopId, secretKey) => {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
};

app.get("/api/payments", async (req, res) => {
  try {
    const response = await axios.get("https://api.yookassa.ru/v3/payments", {
      headers: {
        Authorization: getBasicAuthHeader(SHOP_ID, SECRET_KEY),
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

// Новый GET-запрос
app.get("/api/hello", (req, res) => {
  res.json({ message: "Привет!" });
});

// Убираем app.listen
