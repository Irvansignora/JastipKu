// ============================================================
// JastipKu - Admin Panel JS (Firebase async)
// ============================================================

let currentSection = 'dashboard';
const ADMIN_PASS_KEY = 'jku_admin_auth';

async function checkAuth() {
  const ok = sessionStorage.getItem(ADMIN_PASS_KEY);
  if (!ok) {
    const pw = prompt('🔐 Masukkan password admin:');
    const s  = await DB.getSettings();
    if (pw !== (s.adminPass || 'admin123')) {
      alert('Password salah!'); window.location.href = '/'; return false;
    }
    sessionStorage.setItem(ADMIN_PASS_KEY, '1');
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  showAdminLoading(true);
  try {
    await DB.init();
    const ok = await checkAuth();
    if (!ok) return;
    await applyAdminTheme();
    showSection('dashboard');
  } catch(e) {
    console.error(e);
    alert('Gagal terhubung ke database. Cek koneksi internet.');
  } finally {
    showAdminLoading(false);
  }
});

function showAdminLoading(show) {
  document.getElementById('adminLoadingScreen').style.display = show ? 'flex' : 'none';
  document.getElementById('adminWrap').style.display = show ? 'none' : 'flex';
}

async function applyAdminTheme() {
  const s = await DB.getSettings();
  document.title = 'Admin – ' + s.storeName;
  document.getElementById('adminStoreName').textContent = '⚙️ ' + s.storeName;
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#e8501a');
}

// ---- NAVIGATION ----
function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.nav-link').forEach(el =>
    el.classList.toggle('active', el.dataset.section === name));
  document.querySelectorAll('.admin-section').forEach(el => el.style.display = 'none');
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';
  const titles = {
    dashboard:'📊 Dashboard', products:'🍱 Produk', categories:'📂 Kategori',
    orders:'📦 Pesanan', banners:'📢 Banner & Promo', settings:'⚙️ Pengaturan'
  };
  document.getElementById('pageHeading').textContent = titles[name] || name;
  const renderers = {
    dashboard: renderDashboard, products: renderProducts, categories: renderCategories,
    orders: renderOrders, banners: renderBanners, settings: renderSettings
  };
  if (renderers[name]) renderers[name]();
  closeMobileSidebar();
}

function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarBackdrop').classList.add('show');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

// ---- DASHBOARD ----
async function renderDashboard() {
  try {
    const orders   = await DB.getOrders();
    const products = await DB.getProducts();
    const filter   = document.getElementById('dashFilter')?.value || 'today';
    
    let startDate = 0;
    const now = new Date();
    
    if (filter === 'today') {
      const today = new Date(); today.setHours(0,0,0,0);
      startDate = today.getTime();
      if(document.getElementById('dashPeriodLabelOrders')) document.getElementById('dashPeriodLabelOrders').textContent = '📦 Pesanan Hari Ini';
      if(document.getElementById('dashPeriodLabelRevenue')) document.getElementById('dashPeriodLabelRevenue').textContent = '💰 Pendapatan Hari Ini';
    } else if (filter === 'week') {
      const week = new Date();
      const diff = week.getDate() - week.getDay() + (week.getDay() === 0 ? -6 : 1); // Senin
      week.setDate(diff);
      week.setHours(0,0,0,0);
      startDate = week.getTime();
      if(document.getElementById('dashPeriodLabelOrders')) document.getElementById('dashPeriodLabelOrders').textContent = '📦 Pesanan Minggu Ini';
      if(document.getElementById('dashPeriodLabelRevenue')) document.getElementById('dashPeriodLabelRevenue').textContent = '💰 Pendapatan Minggu Ini';
    } else if (filter === 'month') {
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = month.getTime();
      if(document.getElementById('dashPeriodLabelOrders')) document.getElementById('dashPeriodLabelOrders').textContent = '📦 Pesanan Bulan Ini';
      if(document.getElementById('dashPeriodLabelRevenue')) document.getElementById('dashPeriodLabelRevenue').textContent = '💰 Pendapatan Bulan Ini';
    } else {
      if(document.getElementById('dashPeriodLabelOrders')) document.getElementById('dashPeriodLabelOrders').textContent = '📦 Semua Pesanan';
      if(document.getElementById('dashPeriodLabelRevenue')) document.getElementById('dashPeriodLabelRevenue').textContent = '💰 Semua Pendapatan';
    }
    
    // Total sesuai filter (kecuali status dibatalkan untuk pendapatan)
    const periodOrders  = filter === 'all' ? orders : orders.filter(o => o.createdAt >= startDate);
    const periodRevenue = periodOrders.filter(o => o.status !== 'cancel').reduce((s,o) => s+o.total, 0);

    const pending       = orders.filter(o => o.status === 'pending').length;
    const totalRevenue  = orders.filter(o => o.status !== 'cancel').reduce((s,o) => s+o.total, 0);

    document.getElementById('statTodayOrders').textContent  = periodOrders.length;
    document.getElementById('statPending').textContent      = pending;
    document.getElementById('statTodayRevenue').textContent = DB.formatRupiah(periodRevenue);
    document.getElementById('statTotalRevenue').textContent = DB.formatRupiah(totalRevenue);
    document.getElementById('statProducts').textContent     = products.filter(p=>p.active).length + ' aktif';

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
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Belum ada pesanan</td></tr>`;
  } catch(e) { showToast('❌ Gagal memuat dashboard'); }
}

async function quickUpdateStatus(id, status) {
  try {
    await DB.updateOrderStatus(id, status);
    showToast('✅ Status diperbarui');
    if (currentSection === 'dashboard') renderDashboard();
    if (currentSection === 'orders') renderOrders();
  } catch(e) { showToast('❌ Gagal update status'); }
}

// ---- PRODUCTS ----
let editingProductId = null;

async function renderProducts() {
  const products   = await DB.getProducts();
  const categories = await DB.getCategories();
  const tbody      = document.getElementById('productsTbody');
  tbody.innerHTML = products.map(p => {
    const cat   = categories.find(c => c.id === p.categoryId);
    const thumb = p.imageUrl
      ? `<img src="${CLOUDINARY.mini(p.imageUrl,80)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;display:block" onerror="this.outerHTML='<span style=font-size:1.8rem>${p.emoji}</span>'">`
      : `<span style="font-size:1.8rem">${p.emoji}</span>`;
    return `<tr>
      <td>${thumb}</td>
      <td><strong>${p.name}</strong><br><span style="font-size:0.75rem;color:var(--text3)">${(p.desc||'').substring(0,40)}...</span></td>
      <td>${cat ? cat.emoji+' '+cat.name : '-'}</td>
      <td><strong>${DB.formatRupiah(p.price)}</strong></td>
      <td>
        <span class="badge ${p.active?'badge-active':'badge-inactive'}">${p.active?'Aktif':'Nonaktif'}</span>
        <span class="badge ${p.stock?'badge-stock':'badge-nostock'}">${p.stock?'Ada Stok':'Habis'}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="openProductModal('${p.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" style="margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3)">Belum ada produk</td></tr>`;
}

async function openProductModal(id = null) {
  editingProductId = id;
  const categories = (await DB.getCategories()).filter(c => c.active);
  document.getElementById('productModalTitle').textContent = id ? '✏️ Edit Produk' : '➕ Tambah Produk';

  let p = { categoryId:'', name:'', desc:'', price:'', emoji:'🍱', imageUrl:'', active:true, stock:true };
  if (id) { const found = (await DB.getProducts()).find(x => x.id === id); if (found) p = { ...found }; }

  document.getElementById('pName').value    = p.name;
  document.getElementById('pDesc').value    = p.desc;
  document.getElementById('pPrice').value   = p.price;
  document.getElementById('pCat').innerHTML = categories.map(c =>
    `<option value="${c.id}" ${c.id===p.categoryId?'selected':''}>${c.emoji} ${c.name}</option>`
  ).join('');
  document.getElementById('pEmojiVal').value = p.emoji || '🍱';
  document.getElementById('pImageUrl').value = p.imageUrl || '';
  renderImagePreview(p.imageUrl);
  document.getElementById('pActive').className = 'toggle' + (p.active?' on':'');
  document.getElementById('pActiveVal').value  = p.active ? '1' : '0';
  document.getElementById('pStock').className  = 'toggle' + (p.stock?' on':'');
  document.getElementById('pStockVal').value   = p.stock ? '1' : '0';
  document.getElementById('productModal').classList.add('open');
}

function renderImagePreview(url) {
  const wrap = document.getElementById('imagePreviewWrap');
  if (url) {
    wrap.innerHTML = `<div style="position:relative;display:inline-block;width:100%">
      <img src="${CLOUDINARY.thumb(url,400)}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;display:block" onerror="this.parentNode.innerHTML='<span style=color:var(--text3)>Gagal load gambar</span>'"/>
      <button onclick="removeProductImage()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.85rem">✕</button>
    </div>`;
  } else {
    wrap.innerHTML = `<div style="border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;color:var(--text3);font-size:0.82rem">
      <div style="font-size:1.8rem;margin-bottom:6px">📷</div>Belum ada foto
    </div>`;
  }
}

function removeProductImage() {
  document.getElementById('pImageUrl').value = '';
  renderImagePreview('');
  showToast('🗑️ Foto dihapus');
}

async function uploadProductImage(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/'))    { showToast('❗ File harus berupa gambar!'); return; }
  if (file.size > 5 * 1024 * 1024)        { showToast('❗ Ukuran gambar maksimal 5MB!'); return; }

  const btn = document.getElementById('uploadBtn');
  btn.textContent = '⏳ Mengupload...'; btn.disabled = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY.uploadPreset);
    formData.append('folder', 'jastipku/products');
    const res = await fetch(CLOUDINARY.baseUrl(), { method:'POST', body: formData });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Upload gagal'); }
    const data = await res.json();
    document.getElementById('pImageUrl').value = data.secure_url;
    renderImagePreview(data.secure_url);
    showToast('✅ Foto berhasil diupload!');
  } catch(e) {
    showToast('❌ Upload gagal: ' + e.message);
  } finally {
    btn.textContent = '📷 Upload Foto'; btn.disabled = false; input.value = '';
  }
}

async function saveProduct() {
  const name     = document.getElementById('pName').value.trim();
  const desc     = document.getElementById('pDesc').value.trim();
  const price    = parseInt(document.getElementById('pPrice').value);
  const catId    = document.getElementById('pCat').value;
  const emoji    = document.getElementById('pEmojiVal').value;
  const imageUrl = document.getElementById('pImageUrl').value.trim();
  const active   = document.getElementById('pActiveVal').value === '1';
  const stock    = document.getElementById('pStockVal').value === '1';

  if (!name || !price || !catId) { showToast('❗ Nama, kategori, dan harga wajib diisi!'); return; }

  const btn = document.querySelector('#productModal .modal-footer .btn-primary');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  try {
    const id = editingProductId || DB.genId();
    await DB.saveProduct({ id, categoryId:catId, name, desc, price, emoji, imageUrl, active, stock });
    closeModal('productModal');
    renderProducts();
    showToast(editingProductId ? '✅ Produk diperbarui!' : '✅ Produk ditambahkan!');
  } catch(e) {
    showToast('❌ Gagal menyimpan: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Simpan';
  }
}

async function deleteProduct(id) {
  if (!confirm('Hapus produk ini?')) return;
  try {
    await DB.deleteProduct(id);
    renderProducts();
    showToast('🗑️ Produk dihapus');
  } catch(e) { showToast('❌ Gagal menghapus'); }
}

function toggleField(toggleId, valId) {
  const el = document.getElementById(toggleId);
  const on = !el.classList.contains('on');
  el.className = 'toggle' + (on?' on':'');
  document.getElementById(valId).value = on ? '1' : '0';
}

// ---- CATEGORIES ----
let editingCatId = null;
const CAT_EMOJIS = ['🍱','🍜','🍔','🥤','🧃','🍿','🧊','🥩','🍰','🌮','🥗','🍣','🍝','🥘','🍛','☕','🍵','🥞','🎂'];

async function renderCategories() {
  const cats     = await DB.getCategories();
  const products = await DB.getProducts();
  const tbody    = document.getElementById('catsTbody');
  tbody.innerHTML = cats.map(c => {
    const count = products.filter(p => p.categoryId === c.id).length;
    return `<tr>
      <td style="font-size:1.5rem">${c.emoji}</td>
      <td><strong>${c.name}</strong></td>
      <td>${count} produk</td>
      <td><span class="badge ${c.active?'badge-active':'badge-inactive'}">${c.active?'Aktif':'Nonaktif'}</span></td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="openCatModal('${c.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCat('${c.id}')" style="margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Belum ada kategori</td></tr>`;
}

async function openCatModal(id = null) {
  editingCatId = id;
  let c = { name:'', emoji:'🍱', active:true };
  if (id) { const found = (await DB.getCategories()).find(x => x.id === id); if (found) c = { ...found }; }
  document.getElementById('catModalTitle').textContent = id ? '✏️ Edit Kategori' : '➕ Tambah Kategori';
  document.getElementById('cName').value    = c.name;
  document.getElementById('cEmoji').textContent = c.emoji;
  document.getElementById('cEmojiVal').value = c.emoji;
  document.getElementById('cActive').className = 'toggle' + (c.active?' on':'');
  document.getElementById('cActiveVal').value  = c.active ? '1' : '0';
  document.getElementById('catEmojiGrid').innerHTML = CAT_EMOJIS.map(e =>
    `<div class="emoji-opt ${e===c.emoji?'selected':''}" onclick="selectCatEmoji('${e}')">${e}</div>`
  ).join('');
  document.getElementById('catModal').classList.add('open');
}

function selectCatEmoji(e) {
  document.getElementById('cEmoji').textContent = e;
  document.getElementById('cEmojiVal').value    = e;
  document.querySelectorAll('#catEmojiGrid .emoji-opt').forEach(el =>
    el.classList.toggle('selected', el.textContent === e));
}

async function saveCategory() {
  const name   = document.getElementById('cName').value.trim();
  const emoji  = document.getElementById('cEmojiVal').value;
  const active = document.getElementById('cActiveVal').value === '1';
  if (!name) { showToast('❗ Nama kategori wajib diisi!'); return; }
  try {
    const id = editingCatId || DB.genId();
    await DB.saveCategory({ id, name, emoji, active });
    closeModal('catModal');
    renderCategories();
    showToast(editingCatId ? '✅ Kategori diperbarui!' : '✅ Kategori ditambahkan!');
  } catch(e) { showToast('❌ Gagal menyimpan'); }
}

async function deleteCat(id) {
  if (!confirm('Hapus kategori ini?')) return;
  try {
    await DB.deleteCategory(id);
    renderCategories();
    showToast('🗑️ Kategori dihapus');
  } catch(e) { showToast('❌ Gagal menghapus'); }
}

// ---- ORDERS ----
async function renderOrders() {
  const filter = document.getElementById('orderFilter')?.value || 'all';
  try {
    let orders = await DB.getOrders();
    if (filter !== 'all') orders = orders.filter(o => o.status === filter);
    const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
    const tbody = document.getElementById('ordersTbody');
    tbody.innerHTML = orders.map(o => `
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
        <td><button class="btn btn-sm btn-ghost" onclick="viewOrderDetail('${o.id}')">👁️</button></td>
      </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Belum ada pesanan</td></tr>`;
  } catch(e) { showToast('❌ Gagal memuat pesanan'); }
}

let currentOrderForInvoice = null;

async function viewOrderDetail(id) {
  const orders = await DB.getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  currentOrderForInvoice = o;

  const statusLabel = { pending:'⏳ Menunggu', process:'⚙️ Diproses', delivery:'🛵 Dikirim', done:'✅ Selesai', cancel:'❌ Dibatal' };
  const s = await DB.getSettings();

  const text = `==================================
 ${s.storeName.toUpperCase()}
==================================
No. Nota : ${o.id}
Tanggal  : ${DB.formatDate(o.createdAt)}
Status   : ${statusLabel[o.status] || o.status}
----------------------------------
PELANGGAN:
Nama   : ${o.customer.name}
Alamat : ${o.customer.address}
${o.customer.note ? 'Catatan: ' + o.customer.note + '\n' : ''}----------------------------------
PESANAN:
${o.items.map(i => `${i.name}\n  ${i.qty} x ${DB.formatRupiah(i.price)} = ${DB.formatRupiah(i.price*i.qty)}`).join('\n')}
----------------------------------
Subtotal : ${DB.formatRupiah(o.subtotal)}
Ongkir   : ${DB.formatRupiah(o.deliveryFee)}
----------------------------------
TOTAL    : ${DB.formatRupiah(o.total)}
==================================
Terima kasih telah berbelanja!`;

  document.getElementById('invoiceContent').textContent = text;
  document.getElementById('currentOrderId').value = o.id;
  document.getElementById('orderModal').classList.add('open');
}

function copyInvoiceText() {
  const text = document.getElementById('invoiceContent').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Teks invoice disalin!');
  }).catch(() => {
    showToast('❌ Gagal menyalin teks');
  });
}

async function printInvoice() {
  if (!currentOrderForInvoice) return;
  const o = currentOrderForInvoice;
  const s = await DB.getSettings();
  const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
  
  // Menggunakan iframe tersembunyi jauh lebih stabil di HP (Android/iOS) dan tidak diblokir Popup Blocker
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(`
    <html>
    <head>
      <title>Invoice #${o.id}</title>
      <style>
        /* Desain spesifik untuk printer thermal (58mm - 80mm) */
        body { font-family: 'Courier New', Courier, monospace; padding: 0; color: #000; font-size: 12px; line-height: 1.4; width: 300px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .row span:first-child { flex-shrink: 0; margin-right: 10px; }
        .row span:last-child { text-align: right; word-break: break-all; }
        h2 { margin: 0 0 5px 0; font-size: 16px; }
        .item-name { margin-bottom: 2px; }
        .item-detail { display: flex; justify-content: space-between; padding-left: 10px; font-size: 0.95em; }
        @media print {
          @page { margin: 0.5cm; }
          body { width: 75mm; margin: 0 auto; } /* Menjaga ukuran tetap proporsional seperti thermal meski dicetak di A4 */
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>${s.logoEmoji} ${s.storeName}</h2>
        <div>${s.address}</div>
        <div>WA: +${s.whatsapp}</div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="row"><span>Nota:</span><span class="bold">${o.id}</span></div>
        <div class="row"><span>Tgl:</span><span>${DB.formatDate(o.createdAt)}</span></div>
        <div class="row"><span>Status:</span><span>${statusLabel[o.status]||o.status}</span></div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="bold">Yth. ${o.customer.name}</div>
        <div>${o.customer.address}</div>
        ${o.customer.note ? `<div><i>Catatan: ${o.customer.note}</i></div>` : ''}
      </div>
      <div class="divider"></div>
      <div>
        ${o.items.map(i => `
          <div class="item">
            <div class="item-name">${i.emoji} ${i.name}</div>
            <div class="item-detail">
              <span>${i.qty} x ${DB.formatRupiah(i.price)}</span>
              <span>${DB.formatRupiah(i.price * i.qty)}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${DB.formatRupiah(o.subtotal)}</span></div>
      <div class="row"><span>Ongkir</span><span>${DB.formatRupiah(o.deliveryFee)}</span></div>
      <div class="divider" style="border-top: 2px dashed #000"></div>
      <div class="row bold" style="font-size: 16px;"><span>TOTAL</span><span>${DB.formatRupiah(o.total)}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top: 20px; font-size: 0.9em;">
        Terima kasih atas pesanan Anda!<br>
        ~ ${s.storeName} ~
      </div>
    </body>
    </html>
  `);
  iframe.contentWindow.document.close();

  // Berikan jeda sedikit agar DOM di iframe dirender sempurana sebelum memanggil Print Spooler OS
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Hapus iframe setelah dialog print muncul/selesai
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 5000);
  }, 500);
}

async function exportOrdersCSV() {
  const orders = await DB.getOrders();
  const filter = document.getElementById('orderFilter')?.value || 'all';
  let filteredOrders = orders;
  if (filter !== 'all') filteredOrders = orders.filter(o => o.status === filter);
  
  if (!filteredOrders || filteredOrders.length === 0) {
    showToast('❌ Tidak ada data pesanan untuk ditarik');
    return;
  }
  
  const statusLabel = { pending:'Menunggu', process:'Diproses', delivery:'Dikirim', done:'Selesai', cancel:'Dibatal' };
  
  let csvContent = " \uFEFFID Pesanan,Tanggal,Nama Pelanggan,No WA,Alamat,Status,Subtotal,Ongkir,Total,Item Pesanan\n";
  
  filteredOrders.forEach(o => {
    const id = o.id;
    const date = DB.formatDate(o.createdAt).replace(/,/g, '');
    const name = (o.customer.name||'').replace(/,/g, ' ');
    const wa = o.customer.whatsapp || '';
    const addr = (o.customer.address||'').replace(/,/g, ' ').replace(/\n/g, ' ');
    const stat = statusLabel[o.status] || o.status;
    const sub = o.subtotal || 0;
    const ong = o.deliveryFee || 0;
    const tot = o.total || 0;
    const items = o.items.map(i => `${i.name} (${i.qty}x)`).join('; ');
    
    csvContent += `"${id}","${date}","${name}","${wa}","${addr}","${stat}",${sub},${ong},${tot},"${items}"\n`;
  });
  
  // Create Blob & Link to download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Laporan_JastipKu_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✅ Laporan berhasil diunduh!');
}

// ---- BANNERS ----
let editingBannerId = null;
const BANNER_COLORS = ['#e8501a','#2d8a4e','#7b4fc4','#0a369d','#d4820a','#c0392b','#0c5460','#1a0a00'];

async function renderBanners() {
  const banners = await DB.getBanners();
  const list = document.getElementById('bannersList');
  list.innerHTML = banners.map(b => `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:12px;height:36px;border-radius:4px;background:${b.color};flex-shrink:0"></div>
      <span style="flex:1;font-size:0.88rem;font-weight:700">${b.text}</span>
      <span class="badge ${b.active?'badge-active':'badge-inactive'}">${b.active?'Aktif':'Off'}</span>
      <button class="btn btn-sm btn-ghost" onclick="openBannerModal('${b.id}')">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteBanner('${b.id}')">🗑️</button>
    </div>`).join('') || `<div style="text-align:center;padding:20px;color:var(--text3)">Belum ada banner</div>`;
}

async function openBannerModal(id = null) {
  editingBannerId = id;
  let b = { text:'', color:'#e8501a', active:true };
  if (id) { const found = (await DB.getBanners()).find(x => x.id === id); if (found) b = { ...found }; }
  document.getElementById('bannerModalTitle').textContent = id ? '✏️ Edit Banner' : '➕ Tambah Banner';
  document.getElementById('bText').value   = b.text;
  document.getElementById('bColorVal').value = b.color;
  document.getElementById('bActive').className = 'toggle' + (b.active?' on':'');
  document.getElementById('bActiveVal').value  = b.active ? '1' : '0';
  document.getElementById('colorSwatches').innerHTML = BANNER_COLORS.map(c =>
    `<div class="color-swatch ${c===b.color?'active':''}" style="background:${c}" onclick="selectBannerColor('${c}')"></div>`
  ).join('');
  document.getElementById('bannerModal').classList.add('open');
}

function selectBannerColor(c) {
  document.getElementById('bColorVal').value = c;
  document.querySelectorAll('.color-swatch').forEach(el =>
    el.classList.toggle('active', el.style.background === c || el.style.backgroundColor === c));
}

async function saveBanner() {
  const text   = document.getElementById('bText').value.trim();
  const color  = document.getElementById('bColorVal').value;
  const active = document.getElementById('bActiveVal').value === '1';
  if (!text) { showToast('❗ Teks banner wajib diisi!'); return; }
  try {
    const id = editingBannerId || DB.genId();
    await DB.saveBanner({ id, text, color, active });
    closeModal('bannerModal');
    renderBanners();
    showToast('✅ Banner disimpan!');
  } catch(e) { showToast('❌ Gagal menyimpan'); }
}

async function deleteBanner(id) {
  if (!confirm('Hapus banner ini?')) return;
  try {
    await DB.deleteBanner(id);
    renderBanners();
    showToast('🗑️ Banner dihapus');
  } catch(e) { showToast('❌ Gagal menghapus'); }
}

// ---- SETTINGS ----
const PRIMARY_COLORS = ['#e8501a','#d63031','#e17055','#00b894','#0984e3','#6c5ce7','#fdcb6e','#2d3436'];
const ACCENT_COLORS  = ['#f5a623','#fdcb6e','#55efc4','#74b9ff','#a29bfe','#fd79a8','#e17055','#dfe6e9'];

async function renderSettings() {
  const s = await DB.getSettings();
  document.getElementById('sStoreName').value  = s.storeName;
  document.getElementById('sOwnerName').value  = s.ownerName;
  document.getElementById('sWhatsapp').value   = s.whatsapp;
  document.getElementById('sAddress').value    = s.address;
  document.getElementById('sOpenTime').value   = s.openTime;
  document.getElementById('sCloseTime').value  = s.closeTime;
  document.getElementById('sDelivery').value   = s.deliveryFee;
  document.getElementById('sMinOrder').value   = s.minOrder;
  document.getElementById('sGreeting').value   = s.greeting;
  document.getElementById('sAdminPass').value  = s.adminPass || 'admin123';
  document.getElementById('sLogoEmoji').value  = s.logoEmoji || '🛵';
  document.getElementById('sIsOpen').className = 'toggle' + (s.isOpen?' on':'');
  document.getElementById('sIsOpenVal').value  = s.isOpen ? '1' : '0';

  document.getElementById('primaryColors').innerHTML = PRIMARY_COLORS.map(c =>
    `<div class="color-swatch ${c===s.primaryColor?'active':''}" style="background:${c}" onclick="document.getElementById('sPrimary').value='${c}';this.parentNode.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active'));this.classList.add('active')"></div>`
  ).join('');
  document.getElementById('sPrimary').value = s.primaryColor || '#e8501a';

  document.getElementById('accentColors').innerHTML = ACCENT_COLORS.map(c =>
    `<div class="color-swatch ${c===s.accentColor?'active':''}" style="background:${c}" onclick="document.getElementById('sAccent').value='${c}';this.parentNode.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active'));this.classList.add('active')"></div>`
  ).join('');
  document.getElementById('sAccent').value = s.accentColor || '#f5a623';
}

async function saveSettings() {
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
  const btn = document.querySelector('#sec-settings .btn-primary');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  try {
    await DB.saveSettings(s);
    applyAdminTheme();
    document.documentElement.style.setProperty('--primary', s.primaryColor);
    showToast('✅ Pengaturan disimpan!');
  } catch(e) { showToast('❌ Gagal menyimpan'); }
  finally { btn.disabled = false; btn.textContent = '💾 Simpan Semua Pengaturan'; }
}

async function resetData(type) {
  if (!confirm(`Reset ${type}? Data akan kembali ke default!`)) return;
  if (type === 'orders') {
    const orders = await DB.getOrders();
    for (const o of orders) await DB._fs.deleteDoc(DB._fs.doc(DB._db, 'orders', o.id));
    renderOrders();
  } else if (type === 'all') {
    DB._cache = {};
    localStorage.removeItem('jku_cart');
    showToast('🔄 Refresh halaman untuk reset penuh');
    return;
  }
  showToast('🔄 Data direset!');
}

// ---- MODAL ----
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('adminToast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---- Expose to global scope ----
Object.assign(window, {
  showSection, openMobileSidebar, closeMobileSidebar,
  quickUpdateStatus, openProductModal, saveProduct, deleteProduct,
  renderImagePreview, removeProductImage, uploadProductImage, toggleField,
  openCatModal, saveCategory, deleteCat, selectCatEmoji,
  renderOrders, viewOrderDetail, copyInvoiceText, printInvoice, exportOrdersCSV,
  openBannerModal, saveBanner, deleteBanner, selectBannerColor,
  saveSettings, resetData, closeModal
});
