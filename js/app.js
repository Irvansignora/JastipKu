// ============================================================
// JastipKu - Main App JS
// ============================================================

let currentCat = 'all';
let searchQuery = '';
let installPrompt = null;

// ---- PWA Install ----
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installPrompt = e;
  const bar = document.getElementById('installBar');
  if (bar && !localStorage.getItem('jku_installed')) bar.style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  localStorage.setItem('jku_installed', '1');
  const bar = document.getElementById('installBar');
  if (bar) bar.style.display = 'none';
});

function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();
  installPrompt.userChoice.then(() => {
    installPrompt = null;
    document.getElementById('installBar').style.display = 'none';
  });
}
function dismissInstall() {
  document.getElementById('installBar').style.display = 'none';
  localStorage.setItem('jku_installed', '1');
}

// ---- Service Worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  applySettings();
  renderBanner();
  renderCategories();
  renderProducts();
  updateCartBadge();
  initSearch();
});

function applySettings() {
  const s = DB.getSettings();
  document.title = s.storeName;
  document.getElementById('storeName').textContent = s.logoEmoji + ' ' + s.storeName;
  const dot = document.getElementById('statusDot');
  const statusTxt = document.getElementById('statusTxt');
  if (s.isOpen) {
    dot.className = 'status-dot';
    statusTxt.textContent = 'Buka Sekarang';
  } else {
    dot.className = 'status-dot closed';
    statusTxt.textContent = 'Sedang Tutup';
  }
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#e8501a');
  document.documentElement.style.setProperty('--accent', s.accentColor || '#f5a623');
  document.getElementById('infoName').textContent = s.storeName;
  document.getElementById('infoOwner').textContent = s.ownerName;
  document.getElementById('infoAddr').textContent = s.address;
  document.getElementById('infoHour').textContent = s.openTime + ' – ' + s.closeTime;
  document.getElementById('infoWA').textContent = '+' + s.whatsapp;
  document.getElementById('infoMin').textContent = DB.formatRupiah(s.minOrder);
  document.getElementById('infoDelivery').textContent = DB.formatRupiah(s.deliveryFee);
}

function renderBanner() {
  const banners = DB.getBanners().filter(b => b.active);
  if (!banners.length) return;
  const inner = document.getElementById('bannerInner');
  const doubled = [...banners, ...banners];
  inner.innerHTML = doubled.map(b =>
    `<span class="banner-item" style="color:${b.color==='#1a0a00'?'#fff':b.color}">${b.text}</span>`
  ).join('');
}

function renderCategories() {
  const cats = DB.getCategories().filter(c => c.active);
  const wrap = document.getElementById('catsWrap');
  const all = `<div class="cat-chip ${currentCat==='all'?'active':''}" onclick="filterCat('all')">
    <span class="cat-emoji">🍽️</span><span class="cat-label">Semua</span>
  </div>`;
  wrap.innerHTML = all + cats.map(c =>
    `<div class="cat-chip ${currentCat===c.id?'active':''}" onclick="filterCat('${c.id}')">
      <span class="cat-emoji">${c.emoji}</span><span class="cat-label">${c.name}</span>
    </div>`
  ).join('');
}

function filterCat(id) {
  currentCat = id;
  renderCategories();
  renderProducts();
}

function initSearch() {
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
  });
}

function renderProducts() {
  let products = DB.getProducts().filter(p => p.active);
  if (currentCat !== 'all') products = products.filter(p => p.categoryId === currentCat);
  if (searchQuery) products = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery) || p.desc.toLowerCase().includes(searchQuery)
  );
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="es-emoji">🔍</div>
      <p>Produk tidak ditemukan</p>
    </div>`;
    return;
  }
  grid.innerHTML = products.map((p, i) => {
    const cart = DB.getCart();
    const item = cart.find(c => c.id === p.id);
    const qty = item ? item.qty : 0;
    const imgHtml = p.imageUrl
      ? `<img src="${CLOUDINARY.thumb(p.imageUrl, 300)}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const emojiHtml = `<span style="${p.imageUrl?'display:none':''}">${p.emoji}</span>`;
    return `<div class="product-card ${!p.stock?'out-of-stock':''}" style="animation-delay:${i*0.04}s">
      <div class="product-emoji-wrap">
        ${imgHtml}${emojiHtml}
        ${!p.stock ? '<span class="sold-out-badge">Habis</span>' : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer">
          <span class="product-price">${DB.formatRupiah(p.price)}</span>
          ${qty === 0 ? 
            `<button class="add-btn" ${!p.stock?'disabled':''} onclick="addToCart('${p.id}')">+</button>` :
            `<div class="qty-ctrl">
              <button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button>
              <span class="qty-num">${qty}</span>
              <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
            </div>`
          }
        </div>
      </div>
    </div>`;
  }).join('');
}

// ---- SECRET ADMIN TAP ----
let secretTaps = 0, secretTimer = null;
function secretTap() {
  secretTaps++;
  const hint = document.getElementById('secretHint');
  const remain = 5 - secretTaps;
  if (secretTaps < 5) {
    hint.style.color = 'var(--text3)';
    hint.textContent = remain > 0 ? `${remain}x lagi...` : '';
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => { secretTaps = 0; hint.style.color = 'transparent'; }, 2000);
  } else {
    secretTaps = 0;
    clearTimeout(secretTimer);
    hint.style.color = 'transparent';
    window.location.href = '/admin/';
  }
}

// ---- CART ----
function addToCart(id) {
  const products = DB.getProducts();
  const p = products.find(x => x.id === id);
  if (!p || !p.stock) return;
  let cart = DB.getCart();
  const idx = cart.findIndex(c => c.id === id);
  if (idx >= 0) cart[idx].qty++;
  else cart.push({ id:p.id, name:p.name, price:p.price, emoji:p.emoji, qty:1 });
  DB.saveCart(cart);
  updateCartBadge();
  renderProducts();
  showToast(p.emoji + ' Ditambahkan ke keranjang!');
}

function changeQty(id, delta) {
  let cart = DB.getCart();
  const idx = cart.findIndex(c => c.id === id);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  DB.saveCart(cart);
  updateCartBadge();
  renderProducts();
}

function updateCartBadge() {
  const cart = DB.getCart();
  const total = cart.reduce((s,i) => s+i.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

// ---- CART PAGE ----
function openCart() {
  openPage('cartPage');
  renderCartPage();
}

function renderCartPage() {
  const cart = DB.getCart();
  const s = DB.getSettings();
  const list = document.getElementById('cartList');
  const summary = document.getElementById('cartSummary');
  const checkout = document.getElementById('checkoutSection');
  const emptyEl = document.getElementById('cartEmpty');

  if (!cart.length) {
    list.innerHTML = '';
    summary.style.display = 'none';
    checkout.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';

  const subtotal = cart.reduce((s,i) => s+i.price*i.qty, 0);
  const delivery = s.deliveryFee || 3000;
  const total = subtotal + delivery;

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-emoji">${item.emoji}</span>
      <div class="cart-info">
        <div class="cart-name">${item.name}</div>
        <div class="cart-price">${DB.formatRupiah(item.price)} × ${item.qty} = ${DB.formatRupiah(item.price*item.qty)}</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="cartQty('${item.id}',-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="cartQty('${item.id}',1)">+</button>
      </div>
    </div>
  `).join('');

  summary.style.display = 'block';
  summary.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${DB.formatRupiah(subtotal)}</span></div>
    <div class="summary-row"><span>Ongkir</span><span>${DB.formatRupiah(delivery)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${DB.formatRupiah(total)}</span></div>
  `;
  checkout.style.display = 'block';
}

function cartQty(id, delta) {
  let cart = DB.getCart();
  const idx = cart.findIndex(c => c.id === id);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  DB.saveCart(cart);
  updateCartBadge();
  renderCartPage();
  renderProducts();
}

function submitOrder() {
  const name = document.getElementById('custName').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const note = document.getElementById('custNote').value.trim();
  if (!name || !address) { showToast('❗ Nama dan alamat wajib diisi!'); return; }

  const cart = DB.getCart();
  if (!cart.length) return;
  const s = DB.getSettings();
  const subtotal = cart.reduce((x,i) => x+i.price*i.qty, 0);
  const total = subtotal + (s.deliveryFee||3000);

  const order = {
    id: 'ORD-' + DB.genId().toUpperCase(),
    customer: { name, address, note },
    items: [...cart],
    subtotal, deliveryFee: s.deliveryFee||3000, total,
    status: 'pending',
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  DB.saveOrder(order);
  DB.clearCart();
  updateCartBadge();

  // Build WhatsApp message
  const itemsText = cart.map(i => `  • ${i.name} x${i.qty} = ${DB.formatRupiah(i.price*i.qty)}`).join('\n');
  const waMsg = encodeURIComponent(
`🛵 *PESANAN BARU - ${s.storeName}*
━━━━━━━━━━━━━
📋 Order ID: ${order.id}
👤 Nama: ${name}
📍 Alamat: ${address}
${note ? '📝 Catatan: ' + note : ''}
━━━━━━━━━━━━━
*Detail Pesanan:*
${itemsText}
━━━━━━━━━━━━━
Subtotal: ${DB.formatRupiah(subtotal)}
Ongkir: ${DB.formatRupiah(s.deliveryFee||3000)}
*TOTAL: ${DB.formatRupiah(total)}*
━━━━━━━━━━━━━
Terima kasih sudah memesan! 🙏`
  );

  window.open(`https://wa.me/${s.whatsapp}?text=${waMsg}`, '_blank');
  closePage('cartPage');
  renderProducts();
  showToast('✅ Pesanan berhasil dikirim!');

  // Open orders
  setTimeout(() => { openOrders(); renderOrders(); }, 800);
}

// ---- ORDERS ----
function openOrders() {
  openPage('ordersPage');
  renderOrders();
}

function renderOrders() {
  const orders = DB.getOrders();
  const list = document.getElementById('ordersList');
  if (!orders.length) {
    list.innerHTML = `<div class="empty-state"><div class="es-emoji">📦</div><p>Belum ada pesanan</p></div>`;
    return;
  }
  const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
  list.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">#${o.id}</div>
          <div class="order-date">${DB.formatDate(o.createdAt)}</div>
        </div>
        <span class="order-status status-${o.status}">${statusLabel[o.status]||o.status}</span>
      </div>
      <div class="order-items">${o.items.map(i=>`${i.emoji} ${i.name} ×${i.qty}`).join(', ')}</div>
      <div class="order-footer">
        <span class="order-total">${DB.formatRupiah(o.total)}</span>
        <button class="reorder-btn" onclick="reorder('${o.id}')">🔁 Pesan Lagi</button>
      </div>
    </div>
  `).join('');
}

function reorder(id) {
  const order = DB.getOrders().find(o => o.id === id);
  if (!order) return;
  let cart = [];
  order.items.forEach(item => cart.push({ ...item }));
  DB.saveCart(cart);
  updateCartBadge();
  closePage('ordersPage');
  openCart();
  showToast('✅ Item ditambahkan ke keranjang!');
}

// ---- PAGE NAVIGATION ----
function openPage(id) { document.getElementById(id).classList.add('open'); }
function closePage(id) { document.getElementById(id).classList.remove('open'); }

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
