const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  connectionLimit: 10,
});

connection.connect((err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err);
    return;
  }
  console.log("Подключение к MySQL успешно!");

  const createDatabaseQuery = "CREATE DATABASE IF NOT EXISTS payments";
  connection.query(createDatabaseQuery, (err, result) => {
    if (err) {
      console.error("Ошибка при создании базы данных:", err);
      return;
    }
    console.log("База данных создана или уже существует.");

    connection.changeUser({ database: "payments" }, (err) => {
      if (err) {
        console.error("Ошибка при подключении к базе данных:", err);
        return;
      }
      console.log("Подключение к базе данных успешно!");

      // Создаем таблицу payments, если она не существует
      const createPaymentsTableQuery = `
          CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            payment_method VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            payment_id VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      connection.query(createPaymentsTableQuery, (err, result) => {
        if (err) {
          console.error("Ошибка при создании таблицы payments:", err);
          return;
        }
        console.log("Таблица payments создана или уже существует.");
      });
    });
  });
});

module.exports = connection;
