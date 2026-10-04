'use strict';

const STORAGE_KEY = 'kofeyushka-cart';
const MAX_QTY = 99;

const $ = (selector, root = document) => root.querySelector(selector);

const els = {
  products: $('#products'),
  cart: $('#cart'),
  cartToggle: $('#cartToggle'),
  cartClose: $('#cartClose'),
  cartCount: $('#cartCount'),
  cartList: $('#cartList'),
  cartEmpty: $('#cartEmpty'),
  cartTotal: $('#cartTotal'),
  checkoutBtn: $('#checkoutBtn'),
  overlay: $('#overlay'),
  itemTemplate: $('#cartItemTemplate'),
  dialog: $('#orderDialog'),
  form: $('#orderForm'),
  orderView: $('#orderView'),
  orderSummary: $('#orderSummary'),
  successView: $('#successView'),
};

const catalog = new Map(
  [...document.querySelectorAll('.product')].map((card) => [
    card.dataset.id,
    {
      name: card.dataset.name,
      price: Number(card.dataset.price),
      image: $('.product__image img', card).getAttribute('src'),
    },
  ])
);

const formatPrice = (value) => `${value.toLocaleString('ru-RU')} ₽`;
const clampQty = (qty) => Math.min(Math.max(qty, 1), MAX_QTY);

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    // отбрасываем повреждённые записи и товары, которых нет в каталоге
    return data.filter((item) =>
      catalog.has(item.id) && Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= MAX_QTY
    );
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

let cart = loadCart();

const findItem = (id) => cart.find((item) => item.id === id);
const getCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
const getTotal = () => cart.reduce((sum, item) => sum + catalog.get(item.id).price * item.qty, 0);

function createRow({ id, qty }) {
  const product = catalog.get(id);
  const row = els.itemTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.id = id;
  $('.cart-item__thumb', row).src = product.image;
  $('.cart-item__name', row).textContent = product.name;
  $('.cart-item__unit', row).textContent = `${formatPrice(product.price)} / шт.`;
  $('.cart-item__remove', row).setAttribute('aria-label', `Удалить «${product.name}»`);
  updateRow(row, qty);
  return row;
}

function updateRow(row, qty) {
  $('.qty__input', row).value = qty;
  $('[data-action="dec"]', row).disabled = qty <= 1;
  $('[data-action="inc"]', row).disabled = qty >= MAX_QTY;
  $('.cart-item__sum', row).textContent = formatPrice(catalog.get(row.dataset.id).price * qty);
}

function updateSummary() {
  const count = getCount();
  els.cartCount.textContent = count;
  els.cartTotal.textContent = formatPrice(getTotal());
  els.cartEmpty.hidden = count > 0;
  els.cartList.hidden = count === 0;
  els.checkoutBtn.disabled = count === 0;
}

function renderCart() {
  els.cartList.replaceChildren(...cart.map(createRow));
  updateSummary();
}

function addItem(id) {
  const item = findItem(id);
  if (item) item.qty = clampQty(item.qty + 1);
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
}

function setQty(row, qty) {
  const item = findItem(row.dataset.id);
  item.qty = clampQty(qty);
  saveCart();
  updateRow(row, item.qty);
  updateSummary();
}

function removeItem(row) {
  cart = cart.filter((item) => item.id !== row.dataset.id);
  saveCart();
  row.remove();
  updateSummary();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

els.products.addEventListener('click', (e) => {
  const btn = e.target.closest('.product__add');
  if (btn) addItem(btn.closest('.product').dataset.id);
});

els.cartList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const row = btn.closest('.cart-item');
  const { qty } = findItem(row.dataset.id);

  if (btn.dataset.action === 'inc') setQty(row, qty + 1);
  if (btn.dataset.action === 'dec') setQty(row, qty - 1);
  if (btn.dataset.action === 'remove') removeItem(row);
});

// пересчёт суммы прямо во время ввода количества
els.cartList.addEventListener('input', (e) => {
  if (!e.target.matches('.qty__input')) return;
  const value = Number(e.target.value);
  if (Number.isInteger(value) && value >= 1 && value <= MAX_QTY) {
    setQty(e.target.closest('.cart-item'), value);
  }
});

els.cartList.addEventListener('change', (e) => {
  if (!e.target.matches('.qty__input')) return;
  const row = e.target.closest('.cart-item');
  const value = Math.trunc(Number(e.target.value));
  setQty(row, e.target.value === '' || Number.isNaN(value) ? findItem(row.dataset.id).qty : value);
});

function toggleCart(open) {
  els.cart.hidden = !open;
  els.overlay.hidden = !open;
  els.cartToggle.setAttribute('aria-expanded', String(open));
  if (open) els.cartClose.focus();
}

els.cartToggle.addEventListener('click', () => toggleCart(els.cart.hidden));
els.cartClose.addEventListener('click', () => toggleCart(false));
els.overlay.addEventListener('click', () => toggleCart(false));

els.checkoutBtn.addEventListener('click', () => {
  toggleCart(false);
  els.orderSummary.textContent = `Товаров: ${getCount()} шт. на сумму ${formatPrice(getTotal())}`;
  els.orderView.hidden = false;
  els.successView.hidden = true;
  els.dialog.showModal();
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  els.form.querySelectorAll('input, textarea').forEach((field) => {
    field.value = field.value.trim();
  });
  if (!els.form.reportValidity()) return;

  els.orderView.hidden = true;
  els.successView.hidden = false;
  els.form.reset();
  clearCart();
});

els.dialog.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-dialog]')) els.dialog.close();
});

renderCart();
