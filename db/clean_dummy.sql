-- ============================================================================
-- PEMBERSIH DATA DUMMY PRA-PRODUKSI (AMAN: TIDAK MENGHAPUS DATA ASLI)
-- ============================================================================
DELETE FROM chat_messages WHERE is_dummy = 1;
DELETE FROM reviews WHERE is_dummy = 1;
DELETE FROM complaints WHERE is_dummy = 1;
DELETE FROM orders WHERE is_dummy = 1;
DELETE FROM subscription_plans WHERE is_dummy = 1;
DELETE FROM service_addons WHERE is_dummy = 1;
DELETE FROM services WHERE is_dummy = 1;
DELETE FROM mitra_profiles WHERE is_dummy = 1;
DELETE FROM service_categories WHERE is_dummy = 1;
DELETE FROM users WHERE is_dummy = 1 AND role != 'superadmin';
