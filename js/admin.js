// ============================================================
// JastipKu - Admin Panel JS
// ============================================================

let currentSection = 'dashboard';
const ADMIN_PASS_KEY = 'jku_admin_auth';

// ---- AUTH ----
function checkAuth() {
  const ok = sessionStorage.getItem(ADMIN_PASS_KEY);
  if (!ok) {
    const pw = prompt('🔐 Masukkan password admin:');
    const saved = DB.getSettings().adminPass || 'admin123';
    if (pw !== saved) {
      alert('Password salah!');
      window.location.href = '/';
      return false;
    }
    sessionStorage.setItem(ADMIN_PASS_KEY, '1');
  }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  showSection('dashboard');
  applyAdminTheme();
});

function applyAdminTheme() {
  const s = DB.getSettings();
  document.title = 'Admin – ' + s.storeName;
  document.getElementById('adminStoreName').textContent = '⚙️ ' + s.storeName;
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#e8501a');
}

// ---- SECTION NAVIGATION ----
function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });
  document.querySelectorAll('.admin-section').forEach(el => el.style.display = 'none');
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';

  const titles = {
    dashboard: '📊 Dashboard', products: '🍱 Produk', categories: '📂 Kategori',
    orders: '📦 Pesanan', banners: '📢 Banner & Promo', settings: '⚙️ Pengaturan'
  };
  document.getElementById('pageHeading').textContent = titles[name] || name;

  const renderers = {
    dashboard: renderDashboard, products: renderProducts, categories: renderCategories,
    orders: renderOrders, banners: renderBanners, settings: renderSettings
  };
  if (renderers[name]) renderers[name]();
  closeMobileSidebar();
}

// ---- MOBILE SIDEBAR ----
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarBackdrop').classList.add('show');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

// ---- DASHBOARD ----
function renderDashboard() {
  const orders = DB.getOrders();
  const products = DB.getProducts();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => o.createdAt >= today.getTime());
  const todayRevenue = todayOrders.reduce((s,o) => s+o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancel').reduce((s,o) => s+o.total, 0);

  document.getElementById('statTodayOrders').textContent = todayOrders.length;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statTodayRevenue').textContent = DB.formatRupiah(todayRevenue);
  document.getElementById('statTotalRevenue').textContent = DB.formatRupiah(totalRevenue);
  document.getElementById('statProducts').textContent = products.filter(p=>p.active).length + ' aktif';

  // Recent orders
  const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
  const tbody = document.getElementById('recentOrdersTbody');
  tbody.innerHTML = orders.slice(0,8).map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer.name}</td>
      <td>${DB.formatRupiah(o.total)}</td>
      <td><span class="badge badge-${o.status}">${statusLabel[o.status]||o.status}</span></td>
      <td>${DB.formatDate(o.createdAt)}</td>
      <td>
        <select class="status-select" onchange="quickUpdateStatus('${o.id}',this.value)">
          ${['pending','process','delivery','done','cancel'].map(s=>
            `<option value="${s}" ${o.status===s?'selected':''}>${statusLabel[s]}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Belum ada pesanan</td></tr>`;
}

function quickUpdateStatus(id, status) {
  DB.updateOrderStatus(id, status);
  showToast('✅ Status pesanan diperbarui');
  if (currentSection === 'dashboard') renderDashboard();
  if (currentSection === 'orders') renderOrders();
}

// ---- PRODUCTS ----
let editingProductId = null;
const FOOD_EMOJIS = ['🍱','🍜','🍳','🍗','🥩','🍣','🥘','🫕','🍔','🌮','🥗','🍝','🥙','🌯','🍛','🥟','🥡','🧆','🌽','🥞','🍩','🎂','🍰','🧁','🍪','🍫','🍬','🍭','🧃','🥤','🧋','☕','🍵','🍺','🍹','🍸','🧉','🍶','🥛','🍷','🫖','🍾','🥂','🧊','🍿','🥜','🌰','🍌','🍎','🍇','🍓','🫐','🍈','🍉','🍑','🍒','🍋','🍊','🍍','🥭','🍆','🥑','🥕','🧅','🧄','🌶️','🫑','🥦','🫛'];

function renderProducts() {
  const products = DB.getProducts();
  const categories = DB.getCategories();
  const tbody = document.getElementById('productsTbody');
  tbody.innerHTML = products.map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    return `<tr>
      <td style="font-size:1.5rem">${p.emoji}</td>
      <td><strong>${p.name}</strong><br><span style="font-size:0.75rem;color:var(--text3)">${p.desc.substring(0,40)}...</span></td>
      <td>${cat ? cat.emoji+' '+cat.name : '-'}</td>
      <td><strong>${DB.formatRupiah(p.price)}</strong></td>
      <td>
        <span class="badge ${p.active?'badge-active':'badge-inactive'}">${p.active?'Aktif':'Nonaktif'}</span>
        <span class="badge ${p.stock?'badge-stock':'badge-nostock'}">${p.stock?'Ada Stok':'Habis'}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" style="margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3)">Belum ada produk</td></tr>`;
}

function openProductModal(id = null) {
  editingProductId = id;
  const categories = DB.getCategories().filter(c => c.active);
  const modal = document.getElementById('productModal');
  document.getElementById('productModalTitle').textContent = id ? '✏️ Edit Produk' : '➕ Tambah Produk';

  let p = { id:'', categoryId:'', name:'', desc:'', price:'', emoji:'🍱', active:true, stock:true };
  if (id) { const found = DB.getProducts().find(x => x.id === id); if (found) p = { ...found }; }

  document.getElementById('pName').value = p.name;
  document.getElementById('pDesc').value = p.desc;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pCat').innerHTML = categories.map(c =>
    `<option value="${c.id}" ${c.id===p.categoryId?'selected':''}>${c.emoji} ${c.name}</option>`
  ).join('');
  document.getElementById('pEmoji').textContent = p.emoji;
  document.getElementById('pEmojiVal').value = p.emoji;
  document.getElementById('pActive').className = 'toggle' + (p.active?' on':'');
  document.getElementById('pActiveVal').value = p.active ? '1' : '0';
  document.getElementById('pStock').className = 'toggle' + (p.stock?' on':'');
  document.getElementById('pStockVal').value = p.stock ? '1' : '0';

  // Emoji grid
  document.getElementById('emojiGrid').innerHTML = FOOD_EMOJIS.map(e =>
    `<div class="emoji-opt ${e===p.emoji?'selected':''}" onclick="selectEmoji('${e}')">${e}</div>`
  ).join('');

  modal.classList.add('open');
}

function selectEmoji(e) {
  document.getElementById('pEmoji').textContent = e;
  document.getElementById('pEmojiVal').value = e;
  document.querySelectorAll('.emoji-opt').forEach(el => el.classList.toggle('selected', el.textContent === e));
}

function toggleField(toggleId, valId) {
  const el = document.getElementById(toggleId);
  const val = document.getElementById(valId);
  const on = !el.classList.contains('on');
  el.className = 'toggle' + (on?' on':'');
  val.value = on ? '1' : '0';
}

function saveProduct() {
  const name    = document.getElementById('pName').value.trim();
  const desc    = document.getElementById('pDesc').value.trim();
  const price   = parseInt(document.getElementById('pPrice').value);
  const catId   = document.getElementById('pCat').value;
  const emoji   = document.getElementById('pEmojiVal').value;
  const active  = document.getElementById('pActiveVal').value === '1';
  const stock   = document.getElementById('pStockVal').value === '1';

  if (!name || !price || !catId) { showToast('❗ Nama, kategori, dan harga wajib diisi!'); return; }

  let products = DB.getProducts();
  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx >= 0) products[idx] = { ...products[idx], name, desc, price, categoryId:catId, emoji, active, stock };
  } else {
    products.push({ id: DB.genId(), categoryId:catId, name, desc, price, emoji, active, stock });
  }
  DB.saveProducts(products);
  closeModal('productModal');
  renderProducts();
  showToast(editingProductId ? '✅ Produk diperbarui!' : '✅ Produk ditambahkan!');
}

function editProduct(id) { openProductModal(id); }
function deleteProduct(id) {
  if (!confirm('Hapus produk ini?')) return;
  DB.saveProducts(DB.getProducts().filter(p => p.id !== id));
  renderProducts();
  showToast('🗑️ Produk dihapus');
}

// ---- CATEGORIES ----
let editingCatId = null;
const CAT_EMOJIS = ['🍱','🍜','🍔','🥤','🧃','🍿','🧊','🥩','🍰','🌮','🥗','🍣','🍝','🥘','🍛','☕','🍵','🥞','🎂'];

function renderCategories() {
  const cats = DB.getCategories();
  const products = DB.getProducts();
  const tbody = document.getElementById('catsTbody');
  tbody.innerHTML = cats.map(c => {
    const count = products.filter(p => p.categoryId === c.id).length;
    return `<tr>
      <td style="font-size:1.5rem">${c.emoji}</td>
      <td><strong>${c.name}</strong></td>
      <td>${count} produk</td>
      <td><span class="badge ${c.active?'badge-active':'badge-inactive'}">${c.active?'Aktif':'Nonaktif'}</span></td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="editCategory('${c.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${c.id}')" style="margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Belum ada kategori</td></tr>`;
}

function openCatModal(id = null) {
  editingCatId = id;
  let c = { name:'', emoji:'🍱', active:true };
  if (id) { const found = DB.getCategories().find(x => x.id === id); if (found) c = { ...found }; }
  document.getElementById('catModalTitle').textContent = id ? '✏️ Edit Kategori' : '➕ Tambah Kategori';
  document.getElementById('cName').value = c.name;
  document.getElementById('cEmoji').textContent = c.emoji;
  document.getElementById('cEmojiVal').value = c.emoji;
  document.getElementById('cActive').className = 'toggle' + (c.active?' on':'');
  document.getElementById('cActiveVal').value = c.active ? '1' : '0';
  document.getElementById('catEmojiGrid').innerHTML = CAT_EMOJIS.map(e =>
    `<div class="emoji-opt ${e===c.emoji?'selected':''}" onclick="selectCatEmoji('${e}')">${e}</div>`
  ).join('');
  document.getElementById('catModal').classList.add('open');
}

function selectCatEmoji(e) {
  document.getElementById('cEmoji').textContent = e;
  document.getElementById('cEmojiVal').value = e;
  document.querySelectorAll('#catEmojiGrid .emoji-opt').forEach(el => el.classList.toggle('selected', el.textContent === e));
}

function saveCategory() {
  const name   = document.getElementById('cName').value.trim();
  const emoji  = document.getElementById('cEmojiVal').value;
  const active = document.getElementById('cActiveVal').value === '1';
  if (!name) { showToast('❗ Nama kategori wajib diisi!'); return; }
  let cats = DB.getCategories();
  if (editingCatId) {
    const idx = cats.findIndex(c => c.id === editingCatId);
    if (idx >= 0) cats[idx] = { ...cats[idx], name, emoji, active };
  } else {
    cats.push({ id: DB.genId(), name, emoji, active });
  }
  DB.saveCategories(cats);
  closeModal('catModal');
  renderCategories();
  showToast(editingCatId ? '✅ Kategori diperbarui!' : '✅ Kategori ditambahkan!');
}

function editCategory(id) { openCatModal(id); }
function deleteCategory(id) {
  if (!confirm('Hapus kategori ini? Produk terkait tidak akan terhapus.')) return;
  DB.saveCategories(DB.getCategories().filter(c => c.id !== id));
  renderCategories();
  showToast('🗑️ Kategori dihapus');
}

// ---- ORDERS ----
function renderOrders() {
  const orders = DB.getOrders();
  const filter = document.getElementById('orderFilter')?.value || 'all';
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
  const tbody = document.getElementById('ordersTbody');
  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><strong style="font-size:0.78rem">${o.id}</strong></td>
      <td><strong>${o.customer.name}</strong><br><span style="font-size:0.72rem;color:var(--text3)">${o.customer.address}</span></td>
      <td style="max-width:140px"><span style="font-size:0.75rem">${o.items.map(i=>`${i.emoji}${i.name}×${i.qty}`).join(', ')}</span></td>
      <td><strong>${DB.formatRupiah(o.total)}</strong></td>
      <td>
        <select class="status-select" onchange="quickUpdateStatus('${o.id}',this.value)">
          ${['pending','process','delivery','done','cancel'].map(s=>
            `<option value="${s}" ${o.status===s?'selected':''}>${statusLabel[s]}</option>`
          ).join('')}
        </select>
      </td>
      <td style="font-size:0.72rem">${DB.formatDate(o.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="viewOrderDetail('${o.id}')">👁️</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Belum ada pesanan</td></tr>`;
}

function viewOrderDetail(id) {
  const o = DB.getOrders().find(x => x.id === id);
  if (!o) return;
  const statusLabel = { pending:'⏳ Menunggu', process:'⚙️ Diproses', delivery:'🛵 Dikirim', done:'✅ Selesai', cancel:'❌ Dibatal' };
  const msg = `📋 DETAIL PESANAN\n\nID: ${o.id}\nTanggal: ${DB.formatDate(o.createdAt)}\n\n👤 Pelanggan: ${o.customer.name}\n📍 Alamat: ${o.customer.address}\n${o.customer.note?'📝 Catatan: '+o.customer.note:''}\n\n🛒 ITEM:\n${o.items.map(i=>`  • ${i.emoji} ${i.name} ×${i.qty} = ${DB.formatRupiah(i.price*i.qty)}`).join('\n')}\n\nSubtotal: ${DB.formatRupiah(o.subtotal)}\nOngkir: ${DB.formatRupiah(o.deliveryFee)}\nTOTAL: ${DB.formatRupiah(o.total)}\n\nStatus: ${statusLabel[o.status]}`;
  alert(msg);
}

// ---- BANNERS ----
let editingBannerId = null;
const BANNER_COLORS = ['#e8501a','#2d8a4e','#7b4fc4','#0a369d','#d4820a','#c0392b','#0c5460','#1a0a00'];

function renderBanners() {
  const banners = DB.getBanners();
  const list = document.getElementById('bannersList');
  list.innerHTML = banners.map(b => `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:12px;height:36px;border-radius:4px;background:${b.color};flex-shrink:0"></div>
      <span style="flex:1;font-size:0.88rem;font-weight:700">${b.text}</span>
      <span class="badge ${b.active?'badge-active':'badge-inactive'}">${b.active?'Aktif':'Off'}</span>
      <button class="btn btn-sm btn-ghost" onclick="editBanner('${b.id}')">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteBanner('${b.id}')">🗑️</button>
    </div>
  `).join('') || `<div style="text-align:center;padding:20px;color:var(--text3)">Belum ada banner</div>`;
}

function openBannerModal(id = null) {
  editingBannerId = id;
  let b = { text:'', color:'#e8501a', active:true };
  if (id) { const found = DB.getBanners().find(x => x.id === id); if (found) b = { ...found }; }
  document.getElementById('bannerModalTitle').textContent = id ? '✏️ Edit Banner' : '➕ Tambah Banner';
  document.getElementById('bText').value = b.text;
  document.getElementById('bColorVal').value = b.color;
  document.getElementById('bActive').className = 'toggle' + (b.active?' on':'');
  document.getElementById('bActiveVal').value = b.active ? '1' : '0';
  // Color swatches
  document.getElementById('colorSwatches').innerHTML = BANNER_COLORS.map(c =>
    `<div class="color-swatch ${c===b.color?'active':''}" style="background:${c}" onclick="selectBannerColor('${c}')"></div>`
  ).join('');
  document.getElementById('bannerModal').classList.add('open');
}

function selectBannerColor(c) {
  document.getElementById('bColorVal').value = c;
  document.querySelectorAll('.color-swatch').forEach(el => el.classList.toggle('active', el.style.background===c || el.dataset.c===c));
  document.querySelectorAll('.color-swatch').forEach(el => {
    el.classList.toggle('active', el.style.backgroundColor === hexToRgb(c) || el.style.background === c);
  });
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

function saveBanner() {
  const text   = document.getElementById('bText').value.trim();
  const color  = document.getElementById('bColorVal').value;
  const active = document.getElementById('bActiveVal').value === '1';
  if (!text) { showToast('❗ Teks banner wajib diisi!'); return; }
  let banners = DB.getBanners();
  if (editingBannerId) {
    const idx = banners.findIndex(b => b.id === editingBannerId);
    if (idx >= 0) banners[idx] = { ...banners[idx], text, color, active };
  } else {
    banners.push({ id: DB.genId(), text, color, active });
  }
  DB.saveBanners(banners);
  closeModal('bannerModal');
  renderBanners();
  showToast('✅ Banner disimpan!');
}

function editBanner(id) { openBannerModal(id); }
function deleteBanner(id) {
  if (!confirm('Hapus banner ini?')) return;
  DB.saveBanners(DB.getBanners().filter(b => b.id !== id));
  renderBanners();
  showToast('🗑️ Banner dihapus');
}

// ---- SETTINGS ----
const PRIMARY_COLORS = ['#e8501a','#d63031','#e17055','#00b894','#0984e3','#6c5ce7','#fdcb6e','#2d3436'];
const ACCENT_COLORS  = ['#f5a623','#fdcb6e','#55efc4','#74b9ff','#a29bfe','#fd79a8','#e17055','#dfe6e9'];

function renderSettings() {
  const s = DB.getSettings();
  document.getElementById('sStoreName').value   = s.storeName;
  document.getElementById('sOwnerName').value   = s.ownerName;
  document.getElementById('sWhatsapp').value    = s.whatsapp;
  document.getElementById('sAddress').value     = s.address;
  document.getElementById('sOpenTime').value    = s.openTime;
  document.getElementById('sCloseTime').value   = s.closeTime;
  document.getElementById('sDelivery').value    = s.deliveryFee;
  document.getElementById('sMinOrder').value    = s.minOrder;
  document.getElementById('sGreeting').value    = s.greeting;
  document.getElementById('sAdminPass').value   = s.adminPass || 'admin123';
  document.getElementById('sLogoEmoji').value   = s.logoEmoji || '🛵';
  document.getElementById('sIsOpen').className  = 'toggle' + (s.isOpen?' on':'');
  document.getElementById('sIsOpenVal').value   = s.isOpen ? '1' : '0';

  document.getElementById('primaryColors').innerHTML = PRIMARY_COLORS.map(c =>
    `<div class="color-swatch ${c===s.primaryColor?'active':''}" style="background:${c}" onclick="document.getElementById('sPrimary').value='${c}';this.parentNode.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active'));this.classList.add('active')"></div>`
  ).join('');
  document.getElementById('sPrimary').value = s.primaryColor || '#e8501a';

  document.getElementById('accentColors').innerHTML = ACCENT_COLORS.map(c =>
    `<div class="color-swatch ${c===s.accentColor?'active':''}" style="background:${c}" onclick="document.getElementById('sAccent').value='${c}';this.parentNode.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active'));this.classList.add('active')"></div>`
  ).join('');
  document.getElementById('sAccent').value = s.accentColor || '#f5a623';
}

function saveSettings() {
  const s = {
    storeName:    document.getElementById('sStoreName').value.trim(),
    ownerName:    document.getElementById('sOwnerName').value.trim(),
    whatsapp:     document.getElementById('sWhatsapp').value.trim().replace(/\D/g,''),
    address:      document.getElementById('sAddress').value.trim(),
    openTime:     document.getElementById('sOpenTime').value,
    closeTime:    document.getElementById('sCloseTime').value,
    deliveryFee:  parseInt(document.getElementById('sDelivery').value)||3000,
    minOrder:     parseInt(document.getElementById('sMinOrder').value)||15000,
    greeting:     document.getElementById('sGreeting').value.trim(),
    adminPass:    document.getElementById('sAdminPass').value.trim()||'admin123',
    logoEmoji:    document.getElementById('sLogoEmoji').value.trim()||'🛵',
    isOpen:       document.getElementById('sIsOpenVal').value === '1',
    primaryColor: document.getElementById('sPrimary').value,
    accentColor:  document.getElementById('sAccent').value,
  };
  if (!s.storeName || !s.whatsapp) { showToast('❗ Nama toko & WhatsApp wajib diisi!'); return; }
  DB.saveSettings(s);
  applyAdminTheme();
  document.documentElement.style.setProperty('--primary', s.primaryColor);
  showToast('✅ Pengaturan disimpan!');
}

function resetData(type) {
  if (!confirm(`Reset ${type}? Data akan kembali ke default!`)) return;
  if (type === 'products') { localStorage.removeItem(DB.KEYS.PRODUCTS); renderProducts(); }
  if (type === 'categories') { localStorage.removeItem(DB.KEYS.CATEGORIES); renderCategories(); }
  if (type === 'orders') { localStorage.removeItem(DB.KEYS.ORDERS); renderOrders(); }
  if (type === 'all') {
    Object.values(DB.KEYS).forEach(k => localStorage.removeItem(k));
    showSection('dashboard');
  }
  showToast('🔄 Data direset!');
}

// ---- MODAL UTILS ----
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('adminToast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
