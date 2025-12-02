// server.js
require('dotenv').config();

// ======= Імпорти =======
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db');

const app = express();

// ======= Налаштування Express =======
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,      // на Render HTTP → має бути false
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 1 день
    }
  })
);


// ======= Middleware для адміна =======
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// =====================================
//              КЛІЄНТСЬКА ЧАСТИНА
// =====================================

// Головна сторінка (1 товар)
app.get('/', (req, res) => {
  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Помилка бази даних');
    }

    res.render('index', { product });
  });
});
console.log("=== DEBUG ENV VARS ===");
console.log("ADMIN_USER =", process.env.ADMIN_USER);
console.log("ADMIN_PASS =", process.env.ADMIN_PASS);

// Обробка замовлення
app.post('/order', (req, res) => {
  const { name, phone, city, address, comment, quantity } = req.body;
  const qty = parseInt(quantity, 10) || 1;

  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err || !product) {
      console.error(err);
      return res.status(500).send('Помилка товару');
    }

    const total = product.price * qty;

    db.run(
      `INSERT INTO orders 
       (product_id, customer_name, phone, city, address, comment, quantity, total_price) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

      [product.id, name, phone, city, address, comment, qty, total],

      function (err2) {
        if (err2) {
          console.error(err2);
          return res.status(500).send('Помилка замовлення');
        }

        const orderId = this.lastID;

        // 🔔 БЕЗ SMS — просто показуємо сторінку успіху
        res.render('success', { orderId });
      }
    );
  });
});

// ====== АВТОРИЗАЦІЯ АДМІНА ======
app.post('/admin/login', (req, res) => {

  console.log("\n===== LOGIN ATTEMPT =====");
  console.log("BODY:", req.body);

  const username = req.body.username;
  const password = req.body.password;

  console.log("username =", username);
  console.log("password =", password);
  console.log("ENV ADMIN_USER =", process.env.ADMIN_USER);
  console.log("ENV ADMIN_PASS =", process.env.ADMIN_PASS);

  // --- Перевірка логіна та пароля ---
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    console.log(">>> LOGIN SUCCESS!");
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  console.log(">>> LOGIN FAILED!");
  return res.render('admin/login', { error: 'Невірний логін або пароль' });
});



// Вихід
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Список замовлень
app.get('/admin', requireAdmin, (req, res) => {
  db.all(
    `SELECT id, customer_name, phone, total_price, status, created_at 
     FROM orders ORDER BY created_at DESC`,
    (err, orders) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Помилка бази даних');
      }
      res.render('admin/dashboard', { orders });
    }
  );
});

// Деталі конкретного замовлення
app.get('/admin/order/:id', requireAdmin, (req, res) => {
  const id = req.params.id;

  db.get(
    `SELECT o.*, p.name AS product_name 
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (err || !order) {
        console.error(err);
        return res.status(404).send('Замовлення не знайдено');
      }
      res.render('admin/order', { order });
    }
  );
});

// Оновлення статусу
app.post('/admin/order/:id/status', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Помилка оновлення статусу');
    }
    res.redirect('/admin/order/' + id);
  });
});

// ======= Запуск сервера =======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
