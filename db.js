// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

// 1 раз при старті – створюємо таблиці
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      image TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT,
      address TEXT,
      comment TEXT,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Вставляємо наш товар (якщо ще немає)
  db.get(`SELECT COUNT(*) AS cnt FROM products`, (err, row) => {
    if (err) return console.error('DB error:', err);

    if (row.cnt === 0) {
      db.run(
        `INSERT INTO products (name, description, price, currency, image)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'Преміум кулькова ручка',
          'Елегантна чорна кулькова ручка з золотими акцентами. Ідеальна для подарунка та щоденних записів.',
          199,
          'UAH',
          '/img/pen.jpg',
        ],
        (err2) => {
          if (err2) console.error('Error inserting product:', err2);
          else console.log('Початковий товар додано');
        }
      );
    }
  });
});

module.exports = db;
