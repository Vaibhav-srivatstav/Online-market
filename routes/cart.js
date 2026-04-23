const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

// Get cart
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to cart
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const user = await User.findById(req.user._id);
    const itemIndex = user.cart.findIndex(i => i.product.toString() === productId);

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += quantity;
    } else {
      user.cart.push({ product: productId, quantity });
    }

    await user.save();
    res.json({ message: 'Added to cart', cartCount: user.cart.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quantity
router.put('/update', requireAuth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user._id);
    const item = user.cart.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ error: 'Item not in cart' });

    if (quantity <= 0) {
      user.cart = user.cart.filter(i => i.product.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    await user.save();
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove from cart
router.delete('/remove/:productId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter(i => i.product.toString() !== req.params.productId);
    await user.save();
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cart
router.delete('/clear', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { cart: [] });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;