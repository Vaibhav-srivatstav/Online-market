// API helper
const api = {
  async request(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (url) => api.request('GET', url),
  post: (url, body) => api.request('POST', url, body),
  put: (url, body) => api.request('PUT', url, body),
  delete: (url) => api.request('DELETE', url)
};

// Auth state
let currentUser = null;

async function loadUser() {
  try {
    currentUser = await api.get('/api/auth/me');
    updateNavUser();
    updateCartBadge();
  } catch { }
}

function updateNavUser() {
  const authNav = document.getElementById('authNav');
  const userNav = document.getElementById('userNav');
  if (!authNav || !userNav) return;
  if (currentUser) {
    authNav.style.display = 'none';
    userNav.style.display = 'flex';
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = currentUser.name.split(' ')[0];
  } else {
    authNav.style.display = 'flex';
    userNav.style.display = 'none';
  }
}

async function updateCartBadge() {
  if (!currentUser) return;
  try {
    const cart = await api.get('/api/cart');
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const count = cart.reduce((s, i) => s + i.quantity, 0);
      badge.textContent = count;
      badge.style.display = count ? 'flex' : 'none';
    }
  } catch { }
}

async function logout() {
  await api.post('/api/auth/logout');
  currentUser = null;
  showToast('Logged out', 'success');
  setTimeout(() => window.location.href = '/', 1000);
}

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Stars renderer
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '½';
    else stars += '☆';
  }
  return stars;
}

// Discount calculator
function getDiscount(price, original) {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

// Format price
function formatPrice(p) { return '₹' + p.toLocaleString('en-IN'); }

// Add to cart
async function addToCart(productId, qty = 1) {
  if (!currentUser) { showToast('Please login to add to cart', 'error'); setTimeout(() => window.location.href = '/login', 1200); return; }
  try {
    const data = await api.post('/api/cart/add', { productId, quantity: qty });
    showToast('Added to cart! 🛒', 'success');
    const badge = document.getElementById('cartBadge');
    if (badge) { badge.textContent = data.cartCount; badge.style.display = 'flex'; }
  } catch (err) { showToast(err.message, 'error'); }
}

// Init
document.addEventListener('DOMContentLoaded', loadUser);