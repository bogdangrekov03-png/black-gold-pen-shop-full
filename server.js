// ==============================
//           SERVER.JS
// ==============================

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db');

const app = express();

// ==============================
//   Налаштування шаблонів і статичних файлів
// ==============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// ==============================
//        Сесії (автентифікація)
// ==============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

// ==============================
//      Middleware для адміна
// ==============================
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

// ==============================
//           ГОЛОВНА СТОРІНКА
// ==============================
app.get('/', (req, res) => {
  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err) return res.status(500).send('Помилка бази даних');
    res.render('index', { product });
  });
});

// ==============================
//     СТВОРЕННЯ ЗАМОВЛЕННЯ
// ==============================
app.post('/order', (req, res) => {
  const { name, phone, city, address, comment, quantity } = req.body;
  const qty = parseInt(quantity, 10) || 1;

  db.get(`SELECT * FROM products LIMIT 1`, (err, product) => {
    if (err || !product) return res.status(500).send('Помилка товару');

    const total = product.price * qty;

    db.run(
      `INSERT INTO orders 
        (product_id, customer_name, phone, city, address, comment, quantity, total_price) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product.id, name, phone, city, address, comment, qty, total],

      function (err2) {
        if (err2) return res.status(500).send('Помилка створення замовлення');
        res.render('success', { orderId: this.lastID });
      }
    );
  });
});

// ==============================
//         АДМІН-ПАНЕЛЬ
// ==============================

// --- Сторінка логіну ---
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// --- Обробка логіну ---
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  const USER = process.env.ADMIN_USER;
  const PASS = process.env.ADMIN_PASS;

  if (username === USER && password === PASS) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  res.render('admin/login', { error: 'Невірний логін або пароль' });
});

// --- Вихід ---
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- Головна адмін-панелі — список замовлень ---
app.get('/admin', requireAdmin, (req, res) => {
  db.all(
    `SELECT id, customer_name, phone, total_price, status, created_at
     FROM orders ORDER BY created_at DESC`,
    (err, orders) => {
      if (err) return res.status(500).send('Помилка бази даних');
      res.render('admin/dashboard', { orders });
    }
  );
});

// --- Сторінка одного замовлення ---
app.get('/admin/order/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get(
    `SELECT o.*, p.name AS product_name
     FROM orders o
     JOIN products p ON o.product_id = p.id
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (!order) return res.status(404).send('Замовлення не знайдено');
      res.render('admin/order', { order });
    }
  );
});

// --- Оновлення статусу ---
app.post('/admin/order/:id/status', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], (err) => {
    if (err) return res.status(500).send('Помилка оновлення статусу');
    res.redirect('/admin/order/' + id);
  });
});

// ==============================
//         ЗАПУСК СЕРВЕРА
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('---------------------------------------');
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log('ENV USER:', process.env.ADMIN_USER);
  console.log('ENV PASS:', process.env.ADMIN_PASS);
  console.log('---------------------------------------');
});
