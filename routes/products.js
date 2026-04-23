const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all products with filter/search/sort
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const query = {};

    if (category && category !== 'all') query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortOptions = {
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      'rating': { rating: -1 },
      'newest': { createdAt: -1 },
      'popular': { numReviews: -1 }
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ products, total, pages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(8);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add review
router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ error: 'Already reviewed' });

    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;
    await product.save();
    res.json({ message: 'Review added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample products
router.post('/seed/demo', async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = [
      { name: 'Wireless Noise-Cancelling Headphones', description: 'Premium audio experience with 30-hour battery life and active noise cancellation. Perfect for music lovers and professionals.', price: 2999, originalPrice: 4999, category: 'Electronics', brand: 'SoundPro', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', stock: 50, featured: true, rating: 4.5, numReviews: 128, tags: ['headphones', 'wireless', 'audio'] },
      { name: 'Smart Fitness Watch', description: 'Track your health metrics, GPS, heart rate monitoring, sleep tracking and 7-day battery. Water resistant up to 50m.', price: 5999, originalPrice: 8999, category: 'Electronics', brand: 'FitTech', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', stock: 30, featured: true, rating: 4.3, numReviews: 89, tags: ['watch', 'fitness', 'smartwatch'] },
      { name: 'Premium Leather Backpack', description: 'Handcrafted genuine leather backpack with laptop compartment, multiple pockets. Perfect for work and travel.', price: 3499, originalPrice: 5999, category: 'Fashion', brand: 'LeatherCraft', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', stock: 20, featured: true, rating: 4.7, numReviews: 45, tags: ['backpack', 'leather', 'bag'] },
      { name: 'Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard with Cherry MX switches, anti-ghosting, and programmable macros. N-key rollover.', price: 4499, originalPrice: 6999, category: 'Electronics', brand: 'GameGear', image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600', stock: 40, rating: 4.4, numReviews: 67, tags: ['keyboard', 'gaming', 'mechanical'] },
      { name: 'Minimalist Desk Lamp', description: 'Modern LED desk lamp with touch controls, adjustable brightness, color temperature control, and USB charging port.', price: 1299, originalPrice: 1999, category: 'Home & Living', brand: 'OnlinenArc', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', stock: 60, featured: true, rating: 4.2, numReviews: 34, tags: ['lamp', 'desk', 'LED'] },
      { name: 'Running Shoes Pro', description: 'Lightweight performance running shoes with advanced cushioning technology, breathable mesh upper, and durable outsole.', price: 3999, originalPrice: 5999, category: 'Sports', brand: 'SpeedRun', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', stock: 80, rating: 4.6, numReviews: 156, tags: ['shoes', 'running', 'sports'] },
      { name: 'Stainless Steel Water Bottle', description: 'Double-walled vacuum insulated bottle keeps drinks cold 24hrs, hot 12hrs. BPA-free, leak-proof lid.', price: 799, originalPrice: 1299, category: 'Sports', brand: 'HydroFlow', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', stock: 100, rating: 4.8, numReviews: 212, tags: ['bottle', 'water', 'hydration'] },
      { name: 'Wireless Charging Pad', description: 'Fast 15W Qi wireless charging pad compatible with all Qi-enabled devices. Slim profile, LED indicator, non-slip base.', price: 1499, originalPrice: 2499, category: 'Electronics', brand: 'ChargeFast', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600', stock: 45, rating: 4.1, numReviews: 78, tags: ['charging', 'wireless', 'phone'] },
      { name: 'Scented Soy Candle Set', description: 'Set of 4 hand-poured soy wax candles in calming fragrances: lavender, vanilla, sandalwood, and eucalyptus.', price: 1199, originalPrice: 1799, category: 'Home & Living', brand: 'AromaLux', image: 'https://images.unsplash.com/photo-1608181831688-8b899e9e2f6c?w=600', stock: 35, featured: true, rating: 4.9, numReviews: 93, tags: ['candle', 'scented', 'home'] },
      { name: 'Yoga Mat Premium', description: 'Extra thick 6mm eco-friendly TPE yoga mat with alignment lines, non-slip surface, carrying strap included.', price: 1599, originalPrice: 2499, category: 'Sports', brand: 'ZenFlow', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600', stock: 55, rating: 4.5, numReviews: 41, tags: ['yoga', 'mat', 'fitness'] },
      { name: 'Ceramic Coffee Mug Set', description: 'Set of 4 handmade ceramic mugs with ergonomic handle, microwave and dishwasher safe. 350ml capacity.', price: 899, originalPrice: 1499, category: 'Home & Living', brand: 'CeramiCo', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600', stock: 70, rating: 4.4, numReviews: 58, tags: ['mug', 'coffee', 'ceramic'] },
      { name: 'Portable Bluetooth Speaker', description: 'IPX7 waterproof speaker with 360° sound, 20-hour playtime, built-in mic for calls, and party mode for multiple speakers.', price: 2499, originalPrice: 3999, category: 'Electronics', brand: 'SoundPro', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', stock: 25, featured: true, rating: 4.6, numReviews: 104, tags: ['speaker', 'bluetooth', 'portable'] },
    ];
    await Product.insertMany(products);
    res.json({ message: `${products.length} products seeded!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;