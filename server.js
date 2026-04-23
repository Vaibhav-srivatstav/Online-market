const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connect first, then setup session
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
  })
  .catch(err => console.log('❌ MongoDB error:', err.message));

// Session with connect-mongo v3
const MongoStore = require('connect-mongo')(session);

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret123',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/admin', require('./routes/admin'));

// HTML Pages
const send = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));
app.get('/', send('index.html'));
app.get('/product/:id', send('product.html'));
app.get('/cart', send('cart.html'));
app.get('/login', send('login.html'));
app.get('/register', send('register.html'));
app.get('/orders', send('orders.html'));
app.get('/wishlist', send('wishlist.html'));
app.get('/admin', send('admin.html'));
app.get('/profile', send('profile.html'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 fallback
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🔧 Admin:  http://localhost:${PORT}/admin`);
});