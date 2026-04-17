// ============================================================
// JastipKu - Data Layer (localStorage-based, no backend needed)
// ============================================================

const DB = {
  // ---- Keys ----
  KEYS: {
    SETTINGS:  'jku_settings',
    CATEGORIES:'jku_categories',
    PRODUCTS:  'jku_products',
    ORDERS:    'jku_orders',
    CART:      'jku_cart',
    BANNERS:   'jku_banners',
  },

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ---- SETTINGS ----
  getSettings() {
    return this.get(this.KEYS.SETTINGS) || {
      storeName:    'JastipKu Desa',
      ownerName:    'Admin',
      whatsapp:     '6281234567890',
      address:      'Jl. Desa Makmur No. 1',
      openTime:     '07:00',
      closeTime:    '21:00',
      deliveryFee:  3000,
      minOrder:     15000,
      greeting:     'Halo! Mau pesan apa hari ini? 😊',
      isOpen:       true,
      primaryColor: '#e8501a',
      accentColor:  '#f5a623',
      logoEmoji:    '🛵',
    };
  },
  saveSettings(s) { this.set(this.KEYS.SETTINGS, s); },

  // ---- CATEGORIES ----
  getCategories() {
    return this.get(this.KEYS.CATEGORIES) || [
      { id:'cat1', name:'Makanan', emoji:'🍱', active:true },
      { id:'cat2', name:'Minuman', emoji:'🥤', active:true },
      { id:'cat3', name:'Snack',   emoji:'🍿', active:true },
      { id:'cat4', name:'Frozen',  emoji:'🧊', active:true },
    ];
  },
  saveCategories(c) { this.set(this.KEYS.CATEGORIES, c); },

  // ---- PRODUCTS ----
  getProducts() {
    return this.get(this.KEYS.PRODUCTS) || [
      { id:'p1', categoryId:'cat1', name:'Nasi Goreng Spesial', desc:'Nasi goreng dengan telur, ayam, dan sayuran segar', price:15000, emoji:'🍳', active:true, stock:true },
      { id:'p2', categoryId:'cat1', name:'Mie Ayam Bakso',      desc:'Mie ayam dengan bakso kenyal dan kuah gurih',         price:12000, emoji:'🍜', active:true, stock:true },
      { id:'p3', categoryId:'cat1', name:'Ayam Geprek Sambal',  desc:'Ayam crispy geprek dengan sambal bawang pedas',        price:18000, emoji:'🍗', active:true, stock:true },
      { id:'p4', categoryId:'cat2', name:'Es Teh Manis',        desc:'Teh manis segar dengan es batu',                       price:5000,  emoji:'🧋', active:true, stock:true },
      { id:'p5', categoryId:'cat2', name:'Es Jeruk',            desc:'Jeruk peras segar dengan es',                          price:7000,  emoji:'🍊', active:true, stock:true },
      { id:'p6', categoryId:'cat2', name:'Kopi Susu Gula Aren', desc:'Kopi susu dengan gula aren asli',                      price:10000, emoji:'☕', active:true, stock:true },
      { id:'p7', categoryId:'cat3', name:'Cireng Isi',          desc:'Cireng isi ayam dengan saus kacang',                   price:8000,  emoji:'🥟', active:true, stock:true },
      { id:'p8', categoryId:'cat3', name:'Pisang Goreng Keju',  desc:'Pisang goreng crispy dengan topping keju leleh',       price:10000, emoji:'🍌', active:true, stock:true },
      { id:'p9', categoryId:'cat4', name:'Dimsum Frozen',       desc:'Paket dimsum frozen isi 10 pcs siap kukus',            price:20000, emoji:'🥡', active:true, stock:true },
    ];
  },
  saveProducts(p) { this.set(this.KEYS.PRODUCTS, p); },

  // ---- BANNERS ----
  getBanners() {
    return this.get(this.KEYS.BANNERS) || [
      { id:'b1', text:'🔥 Promo Hari Ini! Beli 2 Minuman Gratis 1', color:'#e8501a', active:true },
      { id:'b2', text:'🛵 Gratis Ongkir untuk Pemesanan di Atas Rp 30.000',    color:'#2d8a4e', active:true },
      { id:'b3', text:'⭐ Open 07.00 - 21.00 • Desa Makmur & Sekitarnya',    color:'#7b4fc4', active:true },
    ];
  },
  saveBanners(b) { this.set(this.KEYS.BANNERS, b); },

  // ---- CART ----
  getCart() { return this.get(this.KEYS.CART) || []; },
  saveCart(c) { this.set(this.KEYS.CART, c); },
  clearCart()  { this.set(this.KEYS.CART, []); },

  // ---- ORDERS ----
  getOrders() { return this.get(this.KEYS.ORDERS) || []; },
  saveOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    this.set(this.KEYS.ORDERS, orders);
    return order;
  },
  updateOrderStatus(id, status) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) { orders[idx].status = status; orders[idx].updatedAt = Date.now(); }
    this.set(this.KEYS.ORDERS, orders);
  },

  // ---- UTILS ----
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },
  formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); },
  formatDate(ts) {
    return new Date(ts).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
};

window.DB = DB;
