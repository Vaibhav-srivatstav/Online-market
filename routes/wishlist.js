const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { requireAuth } = require('../middleware/auth');

// Get wishlist
router.get('/', requireAuth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    res.json(wishlist ? wishlist.products : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle product in wishlist
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });

    const idx = wishlist.products.findIndex(p => p.toString() === productId);
    let added;
    if (idx > -1) { wishlist.products.splice(idx, 1); added = false; }
    else { wishlist.products.push(productId); added = true; }

    wishlist.updatedAt = Date.now();
    await wishlist.save();
    res.json({ added, count: wishlist.products.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Check if product is wishlisted
router.get('/check/:productId', requireAuth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    const wishlisted = wishlist ? wishlist.products.some(p => p.toString() === req.params.productId) : false;
    res.json({ wishlisted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;