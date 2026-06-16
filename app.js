const STORAGE_KEY = 'ecommercesite.products';
const CART_KEY = 'ecommercesite.cart';

const fallbackImage =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80';

const starterProducts = [
  {
    id: 'starter-1',
    name: 'Everyday Backpack',
    price: 89,
    sellerName: 'Maya Studio',
    category: 'Bags',
    description: 'Durable daily backpack with padded storage and clean utility styling.',
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'starter-2',
    name: 'Desk Lamp',
    price: 54,
    sellerName: 'North Home',
    category: 'Home',
    description: 'Adjustable warm-light lamp for focused work and late-night reading.',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'starter-3',
    name: 'Wireless Headphones',
    price: 129,
    sellerName: 'Audio Lane',
    category: 'Audio',
    description: 'Comfortable over-ear headphones with balanced sound and long battery life.',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80',
  },
];

const productGrid = document.querySelector('#productGrid');
const cartList = document.querySelector('#cartList');
const cartCount = document.querySelector('#cartCount');
const cartTotal = document.querySelector('#cartTotal');
const currentUser = document.querySelector('#currentUser');
const toast = document.querySelector('#toast');

const authForm = document.querySelector('#authForm');
const loginTab = document.querySelector('#loginTab');
const signupTab = document.querySelector('#signupTab');
const authButton = document.querySelector('#authButton');
const signupOnlyFields = document.querySelectorAll('.signup-only');
const nameInput = document.querySelector('#nameInput');
const emailInput = document.querySelector('#emailInput');
const sellerNameInput = document.querySelector('#sellerNameInput');

const listingForm = document.querySelector('#listingForm');
const itemNameInput = document.querySelector('#itemNameInput');
const priceInput = document.querySelector('#priceInput');
const categoryInput = document.querySelector('#categoryInput');
const imageInput = document.querySelector('#imageInput');
const descriptionInput = document.querySelector('#descriptionInput');
const resetListingsButton = document.querySelector('#resetListingsButton');

let authMode = 'login';
let userName = 'Guest shopper';
let products = loadProducts();
let cart = loadCart();

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : starterProducts;
}

function loadCart() {
  const saved = localStorage.getItem(CART_KEY);
  return saved ? JSON.parse(saved) : {};
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}

function setAuthMode(nextMode) {
  authMode = nextMode;
  const isSignup = authMode === 'signup';
  loginTab.classList.toggle('active', !isSignup);
  signupTab.classList.toggle('active', isSignup);
  signupOnlyFields.forEach((field) => field.classList.toggle('hidden', !isSignup));
  authButton.textContent = isSignup ? 'Create account' : 'Login';
}

function renderProducts() {
  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.image || fallbackImage}" alt="${product.name}" />
          <div class="product-body">
            <div class="product-title-row">
              <h3>${product.name}</h3>
              <span class="price">${formatPrice(product.price)}</span>
            </div>
            <span class="seller-pill">Sold by ${product.sellerName}</span>
            <p class="product-meta">${product.category}</p>
            <p class="product-description">${product.description}</p>
            <button class="primary" type="button" data-add="${product.id}">Add to cart</button>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderCart() {
  const rows = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter(Boolean);

  const count = rows.reduce((total, row) => total + row.quantity, 0);
  const total = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);

  cartCount.textContent = count;
  cartTotal.textContent = formatPrice(total);

  if (rows.length === 0) {
    cartList.innerHTML = '<div class="empty">Your cart is empty.</div>';
    return;
  }

  cartList.innerHTML = rows
    .map(
      ({ product, quantity }) => `
        <div class="cart-row">
          <div>
            <strong>${product.name}</strong>
            <p class="cart-meta">Sold by ${product.sellerName} · ${formatPrice(product.price)} x ${quantity}</p>
          </div>
          <div class="cart-actions">
            <strong>${formatPrice(product.price * quantity)}</strong>
            <button class="link-button" type="button" data-remove="${product.id}">Remove</button>
          </div>
        </div>
      `,
    )
    .join('');
}

function render() {
  currentUser.textContent = userName;
  renderProducts();
  renderCart();
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const emailName = emailInput.value.split('@')[0] || 'Shopper';
  userName = authMode === 'signup' ? nameInput.value.trim() || emailName : emailName;
  sellerNameInput.value = userName;
  render();
  showToast(authMode === 'signup' ? `Welcome, ${userName}` : `Signed in as ${userName}`);
});

loginTab.addEventListener('click', () => setAuthMode('login'));
signupTab.addEventListener('click', () => setAuthMode('signup'));

listingForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const price = Number(priceInput.value);
  const sellerName = sellerNameInput.value.trim();
  const name = itemNameInput.value.trim();

  if (!name || !sellerName || Number.isNaN(price) || price <= 0) {
    showToast('Add an item name, seller name, and valid price');
    return;
  }

  const product = {
    id: `item-${Date.now()}`,
    name,
    price,
    sellerName,
    category: categoryInput.value.trim() || 'General',
    description: descriptionInput.value.trim() || 'Listed by a marketplace seller.',
    image: imageInput.value.trim() || fallbackImage,
  };

  products = [product, ...products];
  saveProducts();
  listingForm.reset();
  categoryInput.value = 'General';
  sellerNameInput.value = userName === 'Guest shopper' ? '' : userName;
  render();
  showToast(`${product.name} saved at ${formatPrice(product.price)}`);
  window.location.hash = '#shop';
});

productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;

  const productId = button.dataset.add;
  const product = products.find((item) => item.id === productId);
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart();
  renderCart();
  showToast(`${product.name} added to cart`);
});

cartList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;

  delete cart[button.dataset.remove];
  saveCart();
  renderCart();
});

resetListingsButton.addEventListener('click', () => {
  products = starterProducts;
  cart = {};
  saveProducts();
  saveCart();
  render();
  showToast('Demo data reset');
});

render();
