-- ============================================================================
-- SKEMA DATABASE CLOUDFLARE D1 (SQLITE) - JASAKITA PRO MARKETPLACE
-- Mencakup: User, Mitra, Superadmin, Jasa Harian & Langganan, Add-on,
-- Jadwal/Timing, Order/Riwayat, Review/Star, Chat Aman & Jarak,
-- Midtrans Gateway, WhatsApp Notifikasi, Kop Bisnis, SNK/FAQ/Tema.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabel Pengguna (User, Mitra, Superadmin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'mitra', 'superadmin'
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone_encrypted TEXT, -- Nomor WA terenkripsi AES-GCM
  phone_hash TEXT UNIQUE, -- Hash SHA-256 untuk login & pencarian unik tanpa buka nomor asli
  phone_masked TEXT, -- Contoh: 0831-****-3888
  password_hash TEXT NOT NULL, -- PBKDF2-SHA256
  address_encrypted TEXT, -- Alamat lengkap terenkripsi
  address_area TEXT, -- Kecamatan / Kota publik (misal: Gulai Bancah, Bukittinggi)
  lat REAL DEFAULT -0.3055,
  lng REAL DEFAULT 100.3692,
  avatar_url TEXT,
  is_verified INTEGER DEFAULT 0, -- 1 = Terverifikasi KTP/Sertifikat
  is_active INTEGER DEFAULT 1,
  complaint_note TEXT, -- Catatan keluhan/masalah user
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profil Bisnis Mitra (Terpisah & Aman)
CREATE TABLE IF NOT EXISTS mitra_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  slogan TEXT,
  business_photo TEXT,
  bio TEXT,
  skills_json TEXT DEFAULT '[]', -- Array keahlian: ["Urut Badan", "Bekam", "Refleksi"]
  certifications_json TEXT DEFAULT '[]', -- Array sertifikat: [{"title":"Sertifikat PBI","issuer":"Perkumpulan Bekam Indonesia","year":"2024"}]
  solutions_offered TEXT, -- Penjelasan solusi yang diberikan mitra
  service_radius_km REAL DEFAULT 5.0,
  rating_avg REAL DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  total_orders_completed INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_doc_url TEXT,
  is_online INTEGER DEFAULT 1,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Kategori Layanan (Diatur Superadmin)
CREATE TABLE IF NOT EXISTS service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL, -- 'harian' atau 'langganan'
  icon TEXT DEFAULT '🛠️',
  description TEXT,
  min_price INTEGER DEFAULT 25000,
  is_active INTEGER DEFAULT 1,
  is_dummy INTEGER DEFAULT 0
);

-- 4. Katalog Produk / Jasa Mitra (Detail, Harga, Kelas, Solusi)
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mitra_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  service_type TEXT NOT NULL, -- 'harian' (Urut, Tukang, Kebon, Listrik, Ledeng, Gojek) | 'langganan' (Ngaji, Bimbel, Bersih Rumah, Laundry)
  service_class TEXT DEFAULT 'Reguler', -- 'Reguler', 'VIP / Premium', 'Keluarga / Paket Bulanan'
  price INTEGER NOT NULL,
  price_unit TEXT DEFAULT 'per sesi', -- 'per sesi', 'per jam', 'per bulan (4x pertemuan)', 'per kg'
  duration_minutes INTEGER DEFAULT 60,
  description TEXT NOT NULL,
  solution_detail TEXT, -- Masalah yang diselesaikan & metode kerja
  subscription_days TEXT, -- Khusus langganan: 'Senin, Rabu, Jumat' atau 'Setiap Sabtu'
  is_active INTEGER DEFAULT 1,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mitra_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

-- 5. Jasa Add-on (Tambahan Opsional per Layanan)
CREATE TABLE IF NOT EXISTS service_addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  addon_name TEXT NOT NULL,
  addon_price INTEGER NOT NULL,
  addon_desc TEXT,
  is_dummy INTEGER DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- 6. Paket Langganan Platform (Diatur Superadmin untuk Mitra/Member)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_role TEXT DEFAULT 'mitra', -- 'mitra' atau 'user'
  price INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  benefits_json TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  is_dummy INTEGER DEFAULT 0
);

-- 7. Pesanan & Riwayat Transaksi (Booking, Jadwal, Timing, Midtrans)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT UNIQUE NOT NULL, -- Contoh: INV-20261121-8841
  user_id INTEGER NOT NULL,
  mitra_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  addons_selected_json TEXT DEFAULT '[]',
  schedule_date TEXT NOT NULL, -- YYYY-MM-DD
  schedule_time TEXT NOT NULL, -- HH:MM
  timing_notes TEXT, -- Estimasi waktu tiba / durasi pengerjaan
  distance_km REAL DEFAULT 0.0,
  service_address_encrypted TEXT,
  service_address_area TEXT,
  subtotal INTEGER NOT NULL,
  addon_total INTEGER DEFAULT 0,
  admin_fee INTEGER DEFAULT 2500,
  total_amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'midtrans', -- 'midtrans', 'cod_terpercaya'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'expired', 'refunded'
  midtrans_token TEXT,
  midtrans_redirect_url TEXT,
  order_status TEXT DEFAULT 'menunggu_pembayaran', -- 'menunggu_pembayaran', 'dikonfirmasi', 'mitra_menuju_lokasi', 'sedang_dikerjakan', 'selesai', 'dibatalkan', 'komplain'
  process_log_json TEXT DEFAULT '[]', -- Riwayat status & timestamp proses
  user_complaint TEXT,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mitra_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- 8. Ulasan & Bintang (Review & Star)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  mitra_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mitra_id) REFERENCES users(id)
);

-- 9. Chat Aman Privat (Nomor WA asli disamarkan/dilindungi sistem)
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL, -- Format: room_user_{userId}_mitra_{mitraId}
  order_id INTEGER,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message_encrypted TEXT NOT NULL, -- Pesan terenkripsi di database
  distance_info TEXT, -- Info jarak real-time saat chat dikirim (misal: "1.8 km dari lokasi Anda")
  is_read INTEGER DEFAULT 0,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Pengaduan & Masalah Pengguna (Keluhan User/Mitra ke Superadmin)
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_code TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_review', 'resolved'
  admin_reply TEXT,
  is_dummy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Pengaturan Global Superadmin (Tema, Logo, Slogan, Kop Bisnis, SNK, FAQ, Footer, Disclaimer)
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
