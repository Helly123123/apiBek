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
    console.log(response.data.uuid, "uiud");
    return response.data.uuid;
  } catch (error) {
    console.error("Ошибка при получении UUID:", error);
    throw new Error("Ошибка при получении UUID");
  }
};

router.get("/total_payments", async (req, res) => {
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

    const totalAmount = rows[0]?.total_amount || 0;

    res.status(200).json({ total_amount: totalAmount });
  } catch (error) {
    console.error("Ошибка при получении суммы платежей:", error);
    res.status(500).send({
      message: error.message || "Ошибка при получении суммы платежей",
    });
  }
});

module.exports = router;
