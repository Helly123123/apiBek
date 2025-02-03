const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const db = require("./db");
const { v4: uuidv4 } = require("uuid");
const paymentRoutes = require("./routes/createPayments");
const createUserRoutes = require("./routes/createUser");
const getPaymentsList = require("./routes/getPaymentsList");
const getBalance = require("./routes/getBalance");
const app = express();
const PORT = process.env.PORT || 80;
// Настройка CORS
// const corsOptions = {
//   origin: "*",
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   credentials: true,
//   optionsSuccessStatus: 204,
// };
app.use(cors());

app.use(bodyParser.json());
app.use(express.json());
app.use(paymentRoutes);
app.use(createUserRoutes);
app.use(getPaymentsList);
// app.use(getBalance);
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

app.get("/total_payments", async (req, res) => {
  let token = req.headers["authorization"];

  if (!token) {
    console.log("Ошибка: Токен не найден в заголовке Authorization");
    return res
      .status(400)
      .send({ message: "Необходим токен в заголовке Authorization" });
  }
  token = token.split(" ")[1];
  try {
    const uuid = await getUserIdByToken(token);

    const [rows] = await connection
      .promise()
      .query(
        "SELECT SUM(amount) AS total_amount FROM payments WHERE user_id = ?",
        [uuid]
      );

    let totalAmount = 0;
    if (rows && rows.length > 0 && rows[0] && rows[0].total_amount) {
      totalAmount = rows[0].total_amount;
    }
    res.status(200).json({ total_amount: totalAmount });
  } catch (error) {
    console.error("Ошибка при получении суммы платежей:", error);
    res.status(500).send({
      message: error.message || "Ошибка при получении суммы платежей",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
