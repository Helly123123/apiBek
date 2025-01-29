const express = require("express");
const axios = require("axios");
const connection = require("../db"); // Импортируйте вашу конфигурацию базы данных

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
    return response.data.uuid; // Возвращаем UUID
  } catch (error) {
    console.error("Ошибка при получении UUID:", error);
    throw new Error("Ошибка при получении UUID"); // Пробрасываем ошибку дальше
  }
};

router.post("/createUser", async (req, res) => {
  const { userName } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!userName || !token) {
    return res
      .status(400)
      .send({ message: "Ошибка: Необходимы параметры userName, token" });
  }

  try {
    const uuid = await getUserIdByToken(token); // Теперь ожидаем получения UUID
    if (!uuid) {
      return res.status(500).send({ message: "Ошибка: UUID не получен" });
    }

    const insertUserQuery = `
                    INSERT INTO users (username, token)
                    VALUES (?, ?)
                `;
    connection.query(insertUserQuery, [userName, uuid], (err, result) => {
      if (err) {
        console.error("Ошибка при создании пользователя:", err);
        return res
          .status(500)
          .send({ message: "Ошибка при создании пользователя" });
      }
      console.log("Пользователь успешно создан:", {
        id: result.insertId,
        username: userName,
        uuid,
      });
      return res
        .status(201)
        .send({ id: result.insertId, username: userName, uuid });
    });
  } catch (error) {
    console.error("Ошибка при создании пользователя:", error);
    return res.status(500).send({
      message:
        error.message || "Ошибка при получении UUID или создании пользователя",
    });
  }
});

// Экспорт маршрутизатора
module.exports = router;
