# JasaKita Pro — WebApp Marketplace Jasa Harian & Langganan Fullstack

Platform marketplace jasa harian (**Urut, Tukang, Kebon, Listrik, Ledeng, Gojek**) dan jasa langganan (**Ngaji, Bimbel, Bersih Rumah, Laundry**) lengkap dengan portal **User**, **Mitra**, dan **Superadmin**, terintegrasi **Cloudflare Pages + D1 (SQLite)**, **Midtrans Payment Gateway**, dan **WhatsApp Gateway**.

## Fitur Utama
- **User (`public/index.html`)**: Pencarian berdasarkan tipe (Harian / Langganan), kategori, dan jarak terdekat (Haversine GPS); detail produk, harga, kelas, jasa add-on, jadwal & timing; profil terpercaya & sertifikasi mitra; pembayaran Midtrans; riwayat & timeline proses; rating bintang & ulasan; profil CRUD lengkap dengan enkripsi AES-GCM untuk nomor WA & alamat; tiket keluhan; serta Chat Aman Privat (anti-bocoran nomor WA).
- **Mitra (`public/mitra.html`)**: CRUD profil bisnis, foto, slogan, keahlian, sertifikasi, solusi yang diberikan, pengajuan verifikasi; CRUD layanan jasa, harga, kelas, jadwal langganan, dan jasa add-on; manajemen pesanan & update status proses; chat pelanggan.
- **Superadmin (`public/superadmin.html`)**: CRUD pengaturan bisnis, tema warna, logo, slogan, kontak WA pusat (`0831-2444-3888`), email, kategori layanan, paket langganan, verifikasi mitra, balas keluhan, laporan keuangan + cetak **Kop Bisnis Resmi** (`@media print`), pengaturan SNK, FAQ, Copyright, Footer, Disclaimer Header, dan pembersih data dummy.

## Cara Deploy dari HP Android (Acode + GitHub + Cloudflare)
1. **Ekstrak ZIP** ini di penyimpanan HP Anda dan buka foldernya di aplikasi **Acode**.
2. **Push ke GitHub**: Buat repository baru di GitHub, lalu unggah seluruh isi folder proyek ini.
3. **Buat Database D1 di Cloudflare**:
   - Buka **Cloudflare Dashboard → Storage & Databases → D1 SQL Database → Create** (beri nama `jasakita_db`).
   - Salin `database_id` ke file `wrangler.toml`.
   - Masuk ke tab **Console** pada D1 `jasakita_db`, lalu jalankan isi file `db/schema.sql`, dilanjutkan `db/seed_dummy.sql` untuk data awal.
4. **Deploy ke Cloudflare Pages**:
   - Buka **Workers & Pages → Create → Pages → Connect to Git**, pilih repo GitHub Anda.
   - Build output directory: `public` (Build command biarkan kosong).
   - Masuk ke **Settings → Functions → D1 database bindings**: Tambahkan binding `DB` ke `jasakita_db`.
   - Masuk ke **Settings → Environment variables**: Tambahkan `JWT_SECRET`, `ENCRYPTION_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `WA_GATEWAY_URL`, dan `WA_GATEWAY_TOKEN`.
5. **Akun Demo Awal (Password: `demo1234`)**:
   - **Superadmin**: `admin@jasakita.id`
   - **Mitra**: `hendra.urut@example.com`
   - **User**: `budi@example.com`
