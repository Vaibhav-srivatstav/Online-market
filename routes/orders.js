const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Place order
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;
    const user = await User.findById(req.user._id).populate('cart.product');
    if (!user.cart.length) return res.status(400).json({ error: 'Cart is empty' });

    const items = user.cart.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.image,
      price: item.product.price,
      quantity: item.quantity
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = subtotal > 5000 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);

    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
      if (coupon && new Date() <= coupon.validUntil && coupon.usedCount < coupon.usageLimit && subtotal >= coupon.minOrder) {
        couponDiscount = coupon.type === 'percent'
          ? Math.round((subtotal * coupon.value) / 100)
          : coupon.value;
        if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
        coupon.usedCount += 1;
        await coupon.save();
        appliedCoupon = coupon.code;
      }
    }

    const total = Math.max(0, subtotal + shippingCost + tax - couponDiscount);
    const order = new Order({ user: req.user._id, items, shippingAddress, paymentMethod, subtotal, shippingCost, tax, couponDiscount, appliedCoupon, total });
    await order.save();

    for (const item of user.cart) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }
    user.cart = [];
    await user.save();

    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// User's orders
router.get('/my', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single order
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: all orders
router.get('/', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;