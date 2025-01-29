// db.js
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root", // Замените на ваше имя пользователя
  password: "root", // Замените на ваш пароль
  database: "payments", // Убедитесь, что указана база данных
});

// Подключаемся к MySQL и создаем базу данных, если она не существует
connection.connect((err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err);
    return;
  }
  console.log("Подключение к MySQL успешно!");

  // Создаем базу данных, если она не существует
  const createDatabaseQuery = "CREATE DATABASE IF NOT EXISTS payments";
  connection.query(createDatabaseQuery, (err, result) => {
    if (err) {
      console.error("Ошибка при создании базы данных:", err);
      return;
    }
    console.log("База данных создана или уже существует.");

    // Подключаемся к созданной базе данных
    connection.changeUser({ database: "payments" }, (err) => {
      if (err) {
        console.error("Ошибка при подключении к базе данных:", err);
        return;
      }
      console.log("Подключение к базе данных успешно!");

      // Создаем таблицу users, если она не существует
      const createUsersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      connection.query(createUsersTableQuery, (err, result) => {
        if (err) {
          console.error("Ошибка при создании таблицы users:", err);
          return;
        }
        console.log("Таблица users создана или уже существует.");
      });

      // Создаем таблицу payments, если она не существует
      const createPaymentsTableQuery = `
        CREATE TABLE IF NOT EXISTS payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          payment_method VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(3) NOT NULL,
          payment_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
