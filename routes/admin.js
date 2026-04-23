const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { requireAdmin } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find().select('total orderStatus createdAt')
    ]);

    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pending = orders.filter(o => o.orderStatus === 'placed').length;
    const delivered = orders.filter(o => o.orderStatus === 'delivered').length;

    // Revenue by day (last 7 days)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayOrders = orders.filter(o => new Date(o.createdAt) >= d && new Date(o.createdAt) < next);
      last7.push({ date: d.toLocaleDateString('en-IN', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length });
    }

    // Category breakdown
    const products = await Product.find().select('category stock');
    const categories = {};
    products.forEach(p => { categories[p.category] = (categories[p.category] || 0) + 1; });

    res.json({ totalUsers, totalProducts, totalOrders, revenue, pending, delivered, last7, categories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Recent orders
router.get('/recent-orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10);
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update order status
router.patch('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: req.body.status }, { new: true });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;