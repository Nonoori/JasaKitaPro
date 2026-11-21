-- ============================================================================
-- DATA DUMMY REALISTIS UNTUK DEMO & PENGUJIAN (is_dummy = 1)
-- Password semua akun dummy di bawah adalah: Password123!
-- Hash PBKDF2-SHA256 untuk "Password123!" dengan salt statis demo:
-- ============================================================================

-- Pengaturan Superadmin Default
INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES
('brand_name', 'JasaKita Pro'),
('brand_slogan', 'Solusi Jasa Harian & Langganan Terpercaya di Sekitarmu'),
('brand_logo', '🛡️'),
('theme_primary', '#0d9488'),
('theme_accent', '#f59e0b'),
('theme_mode', 'light-elegant'),
('superadmin_wa', '6283124443888'),
('superadmin_email', 'admin@jasakita.id'),
('business_address', 'Jl. Patanangan No. 2, Gulai Bancah, Kota Bukittinggi, Sumatera Barat'),
('kop_header', 'PT JASAKITA NUSANTARA DIGITAL • NIB: 1209260088412 • NPWP: 94.881.204.5-202.000'),
('kop_sub', 'Jl. Patanangan No. 2, Gulai Bancah, Bukittinggi | WA Pusat: 0831-2444-3888 | Email: admin@jasakita.id'),
('header_disclaimer', '🔒 Keamanan Terjamin: Nomor WhatsApp & alamat pribadi Anda dilindungi enkripsi end-to-end. Selalu transaksi melalui aplikasi agar dilindungi garansi.'),
('footer_copyright', '© 2026 JasaKita Pro Indonesia. Hak Cipta Dilindungi Undang-Undang.'),
('snk_text', '1. Setiap pemesanan jasa wajib melalui sistem JasaKita Pro untuk perlindungan garansi layanan.
2. Pembatalan maksimal 2 jam sebelum jadwal kedatangan mitra.
3. Pembayaran diproses aman melalui Midtrans Payment Gateway (QRIS, Virtual Account, E-Wallet).
4. Dilarang membagikan nomor pribadi di luar fitur Chat Aman sebelum pesanan dikonfirmasi.'),
('faq_json', '[{"q":"Bagaimana keamanan nomor WA & alamat saya?","a":"Nomor WhatsApp dan detail alamat rumah Anda dienkripsi AES-GCM dan disamarkan. Mitra hanya melihat area kecamatan sebelum pesanan dikonfirmasi."},{"q":"Apa beda Jasa Harian dan Jasa Langganan?","a":"Jasa Harian dipesan per kedatangan/sesi (Urut, Tukang, Kebon, Listrik, Ledeng, Gojek). Jasa Langganan dijadwalkan rutin mingguan/bulanan (Ngaji, Bimbel, Bersih Rumah, Laundry)."},{"q":"Bagaimana jika layanan tidak sesuai?","a":"Gunakan menu Keluhan & Masalah atau hubungi WhatsApp Superadmin di 0831-2444-3888 untuk mediasi dan garansi ulang."}]');

-- Kategori Layanan (Harian & Langganan)
INSERT OR IGNORE INTO service_categories (id, slug, name, service_type, icon, description, min_price, is_dummy) VALUES
(1, 'urut-terapi', 'Urut & Terapi Badan', 'harian', '💆‍♂️', 'Pijat urut tradisional, refleksi kaki, bekam sunnah, dan terapi kebugaran panggilan.', 75000, 1),
(2, 'tukang-bangunan', 'Tukang Bangunan & Renovasi', 'harian', '🧱', 'Perbaikan atap bocor, keramik, pengecatan, dan renovasi ringan harian.', 120000, 1),
(3, 'tukang-kebon', 'Tukang Kebon & Taman', 'harian', '🌿', 'Potong rumput, pangkas dahan, penataan taman rumah, dan pembersihan halaman.', 80000, 1),
(4, 'teknisi-listrik', 'Teknisi Listrik', 'harian', '⚡', 'Perbaikan korsleting, pasang stop kontak, instalasi lampu, dan MCB.', 65000, 1),
(5, 'tukang-ledeng', 'Tukang Ledeng & Pipa', 'harian', '🚰', 'Perbaikan pipa bocor, saluran mampet, pasang pompa air, dan kuras tandon.', 70000, 1),
(6, 'gojek-kurir', 'Ojek & Kurir Lokal', 'harian', '🛵', 'Antar jemput penumpang, belanja pasar, dan kirim paket kilat dalam kota.', 15000, 1),
(7, 'guru-ngaji', 'Guru Ngaji Privat', 'langganan', '📖', 'Belajar Iqra, Al-Qur''an, tajwid, dan tahsin untuk anak maupun dewasa di rumah.', 150000, 1),
(8, 'bimbel-privat', 'Bimbel & Les Privat', 'langganan', '🎓', 'Pendampingan belajar SD, SMP, SMA (Matematika, Bahasa Inggris, IPA) terstruktur.', 200000, 1),
(9, 'bersih-rumah', 'Bersih Rumah Rutin', 'langganan', '🧹', 'Layanan asisten kebersihan rumah mingguan/bulanan (sapu, pel, kamar mandi, dapur).', 180000, 1),
(10, 'laundry-kiloan', 'Laundry Antar-Jemput', 'langganan', '🧺', 'Paket cuci setrika wangi berlangganan bulanan dengan antar-jemput terjadwal.', 120000, 1);

-- Akun Pengguna (Password demo: demo1234 -> disimpan format plain-demo-prefix agar mudah dites atau PBKDF2)
INSERT OR IGNORE INTO users (id, role, full_name, email, phone_encrypted, phone_hash, phone_masked, password_hash, address_encrypted, address_area, lat, lng, is_verified, is_dummy) VALUES
(1, 'superadmin', 'Superadmin JasaKita', 'admin@jasakita.id', 'ENC:6283124443888', 'hash_6283124443888', '0831-****-3888', 'DEMO:demo1234', 'ENC:Jl. Patanangan No. 2, Gulai Bancah', 'Gulai Bancah, Bukittinggi', -0.3021, 100.3715, 1, 1),
(2, 'user', 'Budi Santoso', 'budi@example.com', 'ENC:6281234567890', 'hash_6281234567890', '0812-****-7890', 'DEMO:demo1234', 'ENC:Perumahan Griya Indah Blok B4, Mandiangin', 'Mandiangin Koto Selayan, Bukittinggi', -0.2985, 100.3750, 1, 1),
(3, 'mitra', 'Ustadz Ahmad Fauzi', 'ahmad.ngaji@example.com', 'ENC:6285211223344', 'hash_6285211223344', '0852-****-3344', 'DEMO:demo1234', 'ENC:Jl. Soekarno Hatta No. 14, Aur Birugo', 'Aur Birugo Tigo Baleh, Bukittinggi', -0.3120, 100.3810, 1, 1),
(4, 'mitra', 'Terapi Sehat Alami (Pak Hendra)', 'hendra.urut@example.com', 'ENC:6281377889900', 'hash_6281377889900', '0813-****-9900', 'DEMO:demo1234', 'ENC:Jl. Patanangan No. 2, Gulai Bancah', 'Gulai Bancah, Bukittinggi', -0.3025, 100.3720, 1, 1),
(5, 'mitra', 'Kang Dedi Teknik & Bangunan', 'dedi.teknik@example.com', 'ENC:6287899001122', 'hash_6287899001122', '0878-****-1122', 'DEMO:demo1234', 'ENC:Jl. Bypass Gadut No. 8', 'Tilatang Kamang, Bukittinggi', -0.2890, 100.3890, 1, 1);

-- Profil Bisnis Mitra
INSERT OR IGNORE INTO mitra_profiles (id, user_id, business_name, slogan, business_photo, bio, skills_json, certifications_json, solutions_offered, service_radius_km, rating_avg, total_reviews, total_orders_completed, verification_status, is_dummy) VALUES
(1, 3, 'Lembaga Privat Ngaji & Bimbel Al-Hikmah', 'Membentuk Generasi Qur''ani & Berprestasi dari Rumah', 'https://images.unsplash.com/photo-1585036156171-384164a8c675?w=400', 'Berpengalaman 8 tahun membimbing anak-anak dan dewasa membaca Al-Qur''an bertajwid serta pendampingan pelajaran sekolah.', '["Guru Ngaji Iqra & Al-Qur''an","Tahsin & Tajwid","Bimbel Matematika SD/SMP","Bimbel Bahasa Inggris"]', '[{"title":"Syahadah Tahsin Bersanad","issuer":"Lembaga Tahfidz Sumbar","year":"2023"},{"title":"Sarjana Pendidikan (S.Pd)","issuer":"UIN Bukittinggi","year":"2020"}]', 'Solusi bagi orang tua sibuk yang ingin anak lancar mengaji dan memahami pelajaran sekolah tanpa harus keluar rumah malam hari.', 6.0, 4.95, 42, 128, 'verified', 1),
(2, 4, 'Klinik & Homecare Urut Refleksi Patanangan', 'Pegel Hilang, Badan Segar, Tidur Nyenyak Kembali', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400', 'Melayani urut badan tradisional, refleksi syaraf kaki, bekam sunnah steril, dan terapi keseleo panggilan ke rumah.', '["Urut Badan Tradisional","Refleksi Kaki","Bekam Steril","Urut Anak & Keseleo"]', '[{"title":"Sertifikat Terapis Bekam & Pijat","issuer":"Perkumpulan Bekam Indonesia (PBI)","year":"2024"},{"title":"STPT Dinas Kesehatan","issuer":"Dinkes Kota Bukittinggi","year":"2025"}]', 'Mengatasi nyeri pinggang, salah urat, kelelahan kerja berat, dan melancarkan peredaran darah dengan alat steril sekali pakai.', 5.0, 4.90, 67, 215, 'verified', 1),
(3, 5, 'Solusi Rumah Kang Dedi (Listrik, Ledeng & Tukang)', 'Cepat Tanggap, Rapi, Bergaransi 30 Hari', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', 'Teknisi serba bisa untuk instalasi listrik rumah, pipa ledeng bocor, pasang pompa air, dan perawatan taman/kebun.', '["Teknisi Listrik","Tukang Ledeng & Pipa","Tukang Bangunan","Tukang Kebon"]', '[{"title":"Sertifikat Kompetensi Instalasi Listrik","issuer":"BNSP / Kemnaker","year":"2022"}]', 'Menyelesaikan masalah darurat rumah tangga seperti korsleting listrik, keran patah, tandon meluap, hingga halaman rimbun.', 8.0, 4.85, 31, 94, 'verified', 1);

-- Katalog Layanan Mitra (Harian & Langganan)
INSERT OR IGNORE INTO services (id, mitra_id, category_id, title, service_type, service_class, price, price_unit, duration_minutes, description, solution_detail, subscription_days, is_dummy) VALUES
(1, 4, 1, 'Urut Badan Full Body + Refleksi Kaki (Homecare)', 'harian', 'VIP / Premium', 95000, 'per sesi (90 menit)', 90, 'Pijat urut seluruh tubuh menggunakan minyak zaitun hangat dilanjutkan totok refleksi telapak kaki.', 'Meredakan ketegangan otot punggung, bahu kaku, pegal linu, dan meningkatkan kualitas tidur.', NULL, 1),
(2, 5, 4, 'Perbaikan Listrik Konslet & Tambah Instalasi', 'harian', 'Reguler', 75000, 'per kunjungan', 60, 'Pengecekan jalur MCB, perbaikan stop kontak terbakar, pemasangan lampu gantung & saklar.', 'Menghilangkan risiko kebakaran akibat arus pendek dan menormalkan daya listrik rumah.', NULL, 1),
(3, 5, 5, 'Perbaikan Pipa Ledeng Bocor & Kuras Tandon', 'harian', 'Reguler', 85000, 'per titik pengerjaan', 90, 'Mengatasi pipa PVC pecah, keran patah di dalam drat, saluran wastafel mampet, dan kuras toren air.', 'Air kembali mengalir lancar tanpa kebocoran yang membuat tagihan PDAM membengkak.', NULL, 1),
(4, 5, 3, 'Jasa Potong Rumput & Rapikan Taman Rumah', 'harian', 'Reguler', 90000, 'per halaman', 120, 'Babat rumput liar dengan mesin potong, pemangkasan dahan pohon hias, dan pembersihan sampah daun.', 'Halaman rumah bersih, asri, dan bebas dari sarang nyamuk atau hewan melata.', NULL, 1),
(5, 3, 7, 'Paket Langganan Guru Ngaji Privat di Rumah (8x/Bulan)', 'langganan', 'Keluarga / Paket Bulanan', 240000, 'per bulan (8x pertemuan)', 60, 'Bimbingan baca Al-Qur''an dari nol (Iqra) hingga lancar bertajwid, hafalan surat pendek & doa harian.', 'Anak didampingi secara sabar 2x seminggu di rumah dengan laporan perkembangan setiap akhir bulan.', 'Selasa & Jumat (16.30 WIB)', 1),
(6, 3, 8, 'Paket Langganan Bimbel Privat SD/SMP (12x/Bulan)', 'langganan', 'VIP / Premium', 360000, 'per bulan (12x pertemuan)', 90, 'Les privat Matematika, IPA, dan Bahasa Inggris sesuai kurikulum sekolah + persiapan ujian.', 'Meningkatkan nilai rapor anak dengan metode belajar interaktif 3x seminggu di rumah.', 'Senin, Rabu, Sabtu (19.00 WIB)', 1),
(7, 5, 9, 'Langganan Bersih Rumah Mingguan (4x/Bulan)', 'langganan', 'Keluarga / Paket Bulanan', 280000, 'per bulan (4x kunjungan)', 180, 'Pembersihan menyeluruh ruang tamu, kamar tidur, dapur, dan penyikatan kamar mandi setiap pekan.', 'Rumah selalu bersih higienis setiap akhir pekan tanpa Anda harus kelelahan.', 'Setiap Sabtu Pagi (08.00 WIB)', 1);

-- Jasa Add-on
INSERT OR IGNORE INTO service_addons (id, service_id, addon_name, addon_price, addon_desc, is_dummy) VALUES
(1, 1, 'Bekam Sunnah 7 Titik (Alat Steril Sekali Pakai)', 45000, 'Tambahan terapi bekam basah higienis dengan jarum & kop baru.', 1),
(2, 1, 'Kerokan & Minyak Terapi Herbal Hangat', 15000, 'Tambahan kerokan punggung untuk masuk angin berat.', 1),
(3, 2, 'Material Kabel NYM + Stop Kontak Broco SNI', 35000, 'Termasuk 5 meter kabel tembaga murni & 1 unit stop kontak.', 1),
(4, 5, 'Buku Iqra / Mushaf Tajwid Warna + Buku Prestasi', 30000, 'Paket perlengkapan belajar mengaji anak.', 1),
(5, 7, 'Cairan Disinfektan & Pembersih Kerak Kamar Mandi', 25000, 'Paket cairan pembersih lengkap dibawa oleh mitra.', 1);

-- Paket Langganan Platform
INSERT OR IGNORE INTO subscription_plans (id, name, target_role, price, duration_days, benefits_json, is_dummy) VALUES
(1, 'Mitra Starter (Gratis)', 'mitra', 0, 365, '["Tampil di pencarian jarak terdekat","Maksimal 3 layanan aktif","Chat aman dengan pelanggan"]', 1),
(2, 'Mitra Pro Terverifikasi', 'mitra', 49000, 30, '["Lencana Mitra Terpercaya Prioritas","Layanan & Add-on Unlimited","Laporan Keuangan & Cetak Invoice Kop Bisnis","Potongan biaya admin 0%"]', 1);

-- Contoh Riwayat Pesanan & Ulasan
INSERT OR IGNORE INTO orders (id, order_code, user_id, mitra_id, service_id, addons_selected_json, schedule_date, schedule_time, timing_notes, distance_km, service_address_encrypted, service_address_area, subtotal, addon_total, admin_fee, total_amount, payment_method, payment_status, order_status, process_log_json, is_dummy) VALUES
(1, 'INV-20261119-1001', 2, 4, 1, '[{"name":"Bekam Sunnah 7 Titik","price":45000}]', '2026-11-19', '16:00', 'Estimasi tiba 15 menit sebelum jadwal, durasi total 110 menit', 1.4, 'ENC:Perumahan Griya Indah Blok B4, Mandiangin', 'Mandiangin Koto Selayan, Bukittinggi', 95000, 45000, 2500, 142500, 'midtrans', 'paid', 'selesai', '[{"time":"2026-11-19 14:10","status":"Pesanan Dibuat"},{"time":"2026-11-19 14:12","status":"Pembayaran Midtrans Terkonfirmasi"},{"time":"2026-11-19 15:45","status":"Mitra Menuju Lokasi (1.4 km)"},{"time":"2026-11-19 16:00","status":"Layanan Sedang Dikerjakan"},{"time":"2026-11-19 17:50","status":"Selesai & Terverifikasi"}]', 1),
(2, 'INV-20261121-1002', 2, 3, 5, '[]', '2026-11-24', '16:30', 'Jadwal rutin Selasa & Jumat sore (60 menit/sesi)', 2.1, 'ENC:Perumahan Griya Indah Blok B4, Mandiangin', 'Mandiangin Koto Selayan, Bukittinggi', 240000, 0, 2500, 242500, 'midtrans', 'paid', 'dikonfirmasi', '[{"time":"2026-11-21 05:30","status":"Langganan Aktif & Dibayar via Midtrans"}]', 1);

INSERT OR IGNORE INTO reviews (id, order_id, user_id, mitra_id, rating, comment, is_dummy) VALUES
(1, 1, 2, 4, 5, 'Urutannya sangat pas di titik pegal, alat bekam steril dan dibuka segelnya di depan saya. Sangat terpercaya!', 1);

INSERT OR IGNORE INTO chat_messages (id, room_id, order_id, sender_id, receiver_id, message_encrypted, distance_info, is_dummy) VALUES
(1, 'room_user_2_mitra_4', 1, 2, 4, 'Assalamualaikum Pak Hendra, apakah bisa bawa minyak zaitun ekstra untuk sesi jam 4 sore nanti?', '1.4 km dari lokasi Mitra', 1),
(2, 'room_user_2_mitra_4', 1, 4, 2, 'Waalaikumsalam Pak Budi, siap insyaAllah sudah saya siapkan lengkap beserta alat bekam sterilnya.', '1.4 km dari lokasi Pelanggan', 1);
