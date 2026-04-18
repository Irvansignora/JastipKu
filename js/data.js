// ============================================================
// JastipKu - Data Layer (Firebase Firestore)
// ============================================================

const CLOUDINARY = {
  cloudName: 'dyhvx9wit',
  uploadPreset: 'jastipku_unsigned',
  baseUrl() { return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`; },
  thumb(url, w=400) {
    if (!url) return '';
    return url.replace('/upload/', `/upload/w_${w},h_${w},c_fill,q_auto:eco,f_webp/`);
  },
  mini(url, w=80) {
    if (!url) return '';
    return url.replace('/upload/', `/upload/w_${w},h_${w},c_fill,q_auto:low,f_webp/`);
  }
};
window.CLOUDINARY = CLOUDINARY;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAziaaMGyZwJ3D82Ui5uD-nUtED3BkL8Jw",
  authDomain: "jastip-c3f06.firebaseapp.com",
  projectId: "jastip-c3f06",
  storageBucket: "jastip-c3f06.firebasestorage.app",
  messagingSenderId: "539374014854",
  appId: "1:539374014854:web:048d4fa328f68b65485c07"
};

const DEFAULTS = {
  settings: {
    storeName:'JastipKu Desa', ownerName:'Admin', whatsapp:'6281234567890',
    address:'Jl. Desa Makmur No. 1', openTime:'07:00', closeTime:'21:00',
    deliveryFee:3000, minOrder:15000, greeting:'Halo! Mau pesan apa hari ini? 😊',
    isOpen:true, primaryColor:'#e8501a', accentColor:'#f5a623', logoEmoji:'🛵', adminPass:'admin123',
  },
  categories: [
    { id:'cat1', name:'Makanan', emoji:'🍱', active:true },
    { id:'cat2', name:'Minuman', emoji:'🥤', active:true },
    { id:'cat3', name:'Snack',   emoji:'🍿', active:true },
    { id:'cat4', name:'Frozen',  emoji:'🧊', active:true },
  ],
  products: [
    { id:'p1', categoryId:'cat1', name:'Nasi Goreng Spesial', desc:'Nasi goreng dengan telur, ayam, dan sayuran segar', price:15000, emoji:'🍳', imageUrl:'', active:true, stock:true },
    { id:'p2', categoryId:'cat1', name:'Mie Ayam Bakso',      desc:'Mie ayam dengan bakso kenyal dan kuah gurih',        price:12000, emoji:'🍜', imageUrl:'', active:true, stock:true },
    { id:'p3', categoryId:'cat1', name:'Ayam Geprek Sambal',  desc:'Ayam crispy geprek dengan sambal bawang pedas',      price:18000, emoji:'🍗', imageUrl:'', active:true, stock:true },
    { id:'p4', categoryId:'cat2', name:'Es Teh Manis',        desc:'Teh manis segar dengan es batu',                    price:5000,  emoji:'🧋', imageUrl:'', active:true, stock:true },
    { id:'p5', categoryId:'cat2', name:'Es Jeruk',            desc:'Jeruk peras segar dengan es',                       price:7000,  emoji:'🍊', imageUrl:'', active:true, stock:true },
    { id:'p6', categoryId:'cat2', name:'Kopi Susu Gula Aren', desc:'Kopi susu dengan gula aren asli',                   price:10000, emoji:'☕', imageUrl:'', active:true, stock:true },
    { id:'p7', categoryId:'cat3', name:'Cireng Isi',          desc:'Cireng isi ayam dengan saus kacang',                price:8000,  emoji:'🥟', imageUrl:'', active:true, stock:true },
    { id:'p8', categoryId:'cat3', name:'Pisang Goreng Keju',  desc:'Pisang goreng crispy dengan topping keju leleh',    price:10000, emoji:'🍌', imageUrl:'', active:true, stock:true },
    { id:'p9', categoryId:'cat4', name:'Dimsum Frozen',       desc:'Paket dimsum frozen isi 10 pcs siap kukus',         price:20000, emoji:'🥡', imageUrl:'', active:true, stock:true },
  ],
  banners: [
    { id:'b1', text:'🔥 Promo Hari Ini! Beli 2 Minuman Gratis 1', color:'#e8501a', active:true },
    { id:'b2', text:'🛵 Gratis Ongkir untuk Pemesanan di Atas Rp 30.000', color:'#2d8a4e', active:true },
    { id:'b3', text:'⭐ Open 07.00 - 21.00 • Desa Makmur & Sekitarnya', color:'#7b4fc4', active:true },
  ],
};

const DB = {
  _db: null,
  _fs: null,
  _cache: {},

  async init() {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy }
      = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(FIREBASE_CONFIG);
    this._db  = getFirestore(app);
    this._fs  = { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy };
    await this._seedIfEmpty();
  },

  async _seedIfEmpty() {
    const { doc, getDoc, setDoc, collection, getDocs } = this._fs;
    const db = this._db;
    
    // Pertama, coba ambil setelan
    const sSnap = await getDoc(doc(db, 'config', 'settings'));
    if (sSnap.exists()) return; // Database sudah aktif, tidak perlu seeding lambat lagi
    
    // Jika belum ada (database baru/reset), kita paralelkan SEMUA request ke Firebase
    const promises = [];
    promises.push(setDoc(doc(db, 'config', 'settings'), DEFAULTS.settings));
    
    // Ambil pengecekan secara berbarengan
    const [cSnap, pSnap, bSnap] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'banners'))
    ]);
    
    // Kumpulkan setiap proses penulisan yang belum ada ke dalam antrean Promise
    if (cSnap.empty) {
      for (const c of DEFAULTS.categories) promises.push(setDoc(doc(db, 'categories', c.id), c));
    }
    if (pSnap.empty) {
      for (const p of DEFAULTS.products) promises.push(setDoc(doc(db, 'products', p.id), p));
    }
    if (bSnap.empty) {
      for (const b of DEFAULTS.banners) promises.push(setDoc(doc(db, 'banners', b.id), b));
    }
    
    // Eksekusi penulisan ribuan data bawaan secara PARALEL dalam satu waktu
    await Promise.all(promises);
  },

  async getSettings() {
    if (this._cache.settings) return this._cache.settings;
    const snap = await this._fs.getDoc(this._fs.doc(this._db, 'config', 'settings'));
    this._cache.settings = snap.exists() ? snap.data() : DEFAULTS.settings;
    return this._cache.settings;
  },
  async saveSettings(s) {
    await this._fs.setDoc(this._fs.doc(this._db, 'config', 'settings'), s);
    this._cache.settings = s;
  },

  async getCategories() {
    if (this._cache.categories) return this._cache.categories;
    const snap = await this._fs.getDocs(this._fs.collection(this._db, 'categories'));
    this._cache.categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this._cache.categories;
  },
  async saveCategory(c) {
    await this._fs.setDoc(this._fs.doc(this._db, 'categories', c.id), c);
    this._cache.categories = null;
  },
  async deleteCategory(id) {
    await this._fs.deleteDoc(this._fs.doc(this._db, 'categories', id));
    this._cache.categories = null;
  },

  async getProducts() {
    if (this._cache.products) return this._cache.products;
    const snap = await this._fs.getDocs(this._fs.collection(this._db, 'products'));
    this._cache.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this._cache.products;
  },
  async saveProduct(p) {
    await this._fs.setDoc(this._fs.doc(this._db, 'products', p.id), p);
    this._cache.products = null;
  },
  async deleteProduct(id) {
    await this._fs.deleteDoc(this._fs.doc(this._db, 'products', id));
    this._cache.products = null;
  },

  async getBanners() {
    if (this._cache.banners) return this._cache.banners;
    const snap = await this._fs.getDocs(this._fs.collection(this._db, 'banners'));
    this._cache.banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this._cache.banners;
  },
  async saveBanner(b) {
    await this._fs.setDoc(this._fs.doc(this._db, 'banners', b.id), b);
    this._cache.banners = null;
  },
  async deleteBanner(id) {
    await this._fs.deleteDoc(this._fs.doc(this._db, 'banners', id));
    this._cache.banners = null;
  },

  async getOrders() {
    const { collection, getDocs, query, orderBy } = this._fs;
    const q = query(collection(this._db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async saveOrder(order) {
    await this._fs.setDoc(this._fs.doc(this._db, 'orders', order.id), order);
    return order;
  },
  async updateOrderStatus(id, status) {
    await this._fs.updateDoc(this._fs.doc(this._db, 'orders', id), { status, updatedAt: Date.now() });
  },

  // Cart tetap localStorage (per-user, tidak perlu sync)
  getCart()   { try { return JSON.parse(localStorage.getItem('jku_cart')) || []; } catch { return []; } },
  saveCart(c) { localStorage.setItem('jku_cart', JSON.stringify(c)); },
  clearCart() { localStorage.setItem('jku_cart', JSON.stringify([])); },

  // Realtime listeners
  onOrders(cb) {
    const { collection, onSnapshot, query, orderBy } = this._fs;
    const q = query(collection(this._db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  genId()        { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },
  formatRupiah(n){ return 'Rp ' + Number(n).toLocaleString('id-ID'); },
  formatDate(ts) {
    return new Date(ts).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
};

window.DB = DB;
