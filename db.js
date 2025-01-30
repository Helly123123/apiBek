const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  port: process.env.MYSQL_PORT,
  connectionLimit: 10,
});

// Функция для создания базы данных и таблицы (если их нет)
const initDatabase = async () => {
  try {
    // Проверяем, есть ли база данных
    const [databaseCheckResult] = await connection
      .promise()
      .query(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [process.env.MYSQL_DATABASE]
      );

    if (databaseCheckResult.length === 0) {
      console.log("База данных не существует, создаем...");
      await connection
        .promise()
        .query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);
      console.log("База данных создана успешно!");
    } else {
      console.log(`База данных ${process.env.MYSQL_DATABASE} существует`);
    }

    // Подключаемся к созданной базе данных
    await connection.promise().query(`USE ${process.env.MYSQL_DATABASE}`);
    console.log(`Подключились к базе данных ${process.env.MYSQL_DATABASE}`);

    // Проверяем, существует ли таблица payments
    const [tableCheckResult] = await connection
      .promise()
      .query("SHOW TABLES LIKE 'payments'");

    if (tableCheckResult.length === 0) {
      console.log("Таблица payments не существует, создаем...");
      await connection.promise().query(`
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
            `);
      console.log("Таблица payments создана успешно!");
    } else {
      console.log("Таблица payments уже существует.");
    }
  } catch (err) {
    console.error("Ошибка при инициализации базы данных:", err);
  }
};

initDatabase();

module.exports = connection;
