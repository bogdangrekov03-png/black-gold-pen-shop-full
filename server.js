// ==================================================
//                 ІМПОРТИ
// ==================================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db');

const app = express();

// ==================================================
//              НАЛАШТУВАННЯ EXPRESS
// ==================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Сесія
app.use(
  session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

// ==================================================
//              DEBUG ENVIRONMENT VARS
// ==================================================
console.log("=== DEBUG ENV VARS ===");
console.log("ADMIN_USER =", process.env.ADMIN_USER);
console.log("ADMIN_PASS =", process.env.ADMIN_PASS);

// ==================================================
//                MIDDLEWARE АДМІНА
// ==================================================
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// ==================================================
//                  ГОЛОВНА СТОРІНКА
// ==================================================
app.get('/', (req, res) => {
  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err) return res.status(500).send("Помилка бази даних");
    res.render('index', { product });
  });
});

// ==================================================
//                  ОФОРМЛЕННЯ ЗАМОВЛЕННЯ
// ==================================================
app.post('/order', (req, res) => {
  const { name, phone, city, address, comment, quantity } = req.body;
  const qty = parseInt(quantity, 10) || 1;

  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err || !product) return res.status(500).send("Помилка товару");

    const total = product.price * qty;

    db.run(
      `INSERT INTO orders 
      (product_id, customer_name, phone, city, address, comment, quantity, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product.id, name, phone, city, address, comment, qty, total],
      function (err2) {
        if (err2) return res.status(500).send("Помилка замовлення");

        res.render("success", { orderId: this.lastID });
      }
    );
  });
});

// ==================================================
//               АДМІН-ПАНЕЛЬ
// ==================================================

// ===== GET: показати форму логіну =====
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// ===== POST: авторизація =====
app.post('/admin/login', (req, res) => {
  console.log("\n===== LOGIN ATTEMPT =====");
  console.log("BODY:", req.body);

  const username = req.body.username;
  const password = req.body.password;

  console.log("Form username =", username);
  console.log("Form password =", password);
  console.log("ENV ADMIN_USER =", process.env.ADMIN_USER);
  console.log("ENV ADMIN_PASS =", process.env.ADMIN_PASS);

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    console.log(">>> LOGIN SUCCESS!");
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  console.log(">>> LOGIN FAILED!");
  res.render('admin/login', { error: "Невірний логін або пароль" });
});

// ===== Вихід =====
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ===== Сторінка замовлень =====
app.get('/admin', requireAdmin, (req, res) => {
  db.all(
    `SELECT id, customer_name, phone, total_price, status, created_at
     FROM orders ORDER BY created_at DESC`,
    (err, orders) => {
      if (err) return res.status(500).send("Помилка бази даних");
      res.render('admin/dashboard', { orders });
    }
  );
});

// ===== Деталі замовлення =====
app.get('/admin/order/:id', requireAdmin, (req, res) => {
  const id = req.params.id;

  db.get(
    `SELECT o.*, p.name AS product_name
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (err || !order) return res.status(404).send("Замовлення не знайдено");
      res.render('admin/order', { order });
    }
  );
});

// ===== Оновлення статусу =====
app.post('/admin/order/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  db.run(
    `UPDATE orders SET status = ? WHERE id = ?`,
    [status, id],
    (err) => {
      if (err) return res.status(500).send("Помилка оновлення статусу");
      res.redirect('/admin/order/' + id);
    }
  );
});

// ==================================================
//                 ЗАПУСК СЕРВЕРА
// ==================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
