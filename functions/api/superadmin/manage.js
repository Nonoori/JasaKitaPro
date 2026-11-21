import { jsonResponse } from "../../_lib/security.js";

export async function onRequestGet({ env }) {
  const users = await env.DB.prepare(
    `SELECT u.id, u.role, u.full_name, u.email, u.phone_masked, u.address_area, u.is_verified, u.is_active, u.is_dummy,
            mp.business_name, mp.verification_status, mp.rating_avg, mp.total_orders_completed
     FROM users u LEFT JOIN mitra_profiles mp ON mp.user_id = u.id ORDER BY u.id DESC`
  ).all();

  const categories = await env.DB.prepare("SELECT * FROM service_categories ORDER BY id ASC").all();
  const plans = await env.DB.prepare("SELECT * FROM subscription_plans ORDER BY id ASC").all();
  const orders = await env.DB.prepare(
    `SELECT o.*, s.title AS service_title, u.full_name AS customer_name, m.full_name AS mitra_name
     FROM orders o
     JOIN services s ON o.service_id = s.id
     JOIN users u ON o.user_id = u.id
     JOIN users m ON o.mitra_id = m.id
     ORDER BY o.id DESC`
  ).all();
  const complaints = await env.DB.prepare(
    `SELECT c.*, u.full_name FROM complaints c JOIN users u ON c.user_id = u.id ORDER BY c.id DESC`
  ).all();
  const settingsRows = await env.DB.prepare("SELECT setting_key, setting_value FROM app_settings").all();

  const settings = {};
  for (const r of settingsRows.results || []) settings[r.setting_key] = r.setting_value;

  // Ringkasan Laporan Keuangan
  const paidOrders = (orders.results || []).filter((o) => o.payment_status === "paid");
  const grossRevenue = paidOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const adminRevenue = paidOrders.reduce((acc, o) => acc + (o.admin_fee || 0), 0);

  return jsonResponse({
    users: users.results || [],
    categories: categories.results || [],
    plans: plans.results || [],
    orders: orders.results || [],
    complaints: complaints.results || [],
    settings,
    finance: {
      total_transactions: paidOrders.length,
      gross_revenue: grossRevenue,
      admin_revenue: adminRevenue,
      mitra_payout: grossRevenue - adminRevenue,
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "save_settings") {
      const entries = Object.entries(body.settings || {});
      for (const [k, v] of entries) {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
        )
          .bind(k, String(v))
          .run();
      }
      return jsonResponse({ ok: true, message: "Pengaturan Bisnis, Kop, Tema, & Legalitas tersimpan." });
    }

    if (action === "save_category") {
      const { id, name, slug, service_type, icon, description, min_price } = body;
      if (id) {
        await env.DB.prepare(
          "UPDATE service_categories SET name=?, slug=?, service_type=?, icon=?, description=?, min_price=? WHERE id=?"
        )
          .bind(name, slug, service_type, icon || "🛠️", description || "", Number(min_price || 25000), id)
          .run();
      } else {
        await env.DB.prepare(
          "INSERT INTO service_categories (name, slug, service_type, icon, description, min_price) VALUES (?, ?, ?, ?, ?, ?)"
        )
          .bind(name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), service_type, icon || "🛠️", description || "", Number(min_price || 25000))
          .run();
      }
      return jsonResponse({ ok: true, message: "Kategori layanan berhasil disimpan." });
    }

    if (action === "delete_category") {
      await env.DB.prepare("DELETE FROM service_categories WHERE id = ?").bind(body.id).run();
      return jsonResponse({ ok: true, message: "Kategori dihapus." });
    }


    if (action === "save_plan") {
  const { id, name, target_role, price, duration_days, benefits } = body;
  const benefitsJson = JSON.stringify(
    Array.isArray(benefits) ? benefits : String(benefits || "").split(/\r?\n/).filter(Boolean)
  );

      if (id) {
        await env.DB.prepare(
          "UPDATE subscription_plans SET name=?, target_role=?, price=?, duration_days=?, benefits_json=? WHERE id=?"
        )
          .bind(name, target_role || "mitra", Number(price), Number(duration_days), benefitsJson, id)
          .run();
      } else {
        await env.DB.prepare(
          "INSERT INTO subscription_plans (name, target_role, price, duration_days, benefits_json) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(name, target_role || "mitra", Number(price), Number(duration_days), benefitsJson)
          .run();
      }
      return jsonResponse({ ok: true, message: "Paket langganan disimpan." });
    }

    if (action === "verify_mitra") {
      const { user_id, status } = body; // 'verified' | 'rejected'
      await env.DB.prepare("UPDATE mitra_profiles SET verification_status = ? WHERE user_id = ?").bind(status, user_id).run();
      await env.DB.prepare("UPDATE users SET is_verified = ? WHERE id = ?").bind(status === "verified" ? 1 : 0, user_id).run();
      return jsonResponse({ ok: true, message: `Status verifikasi mitra diubah menjadi ${status}.` });
    }

    if (action === "toggle_user") {
      await env.DB.prepare("UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(body.user_id)
        .run();
      return jsonResponse({ ok: true, message: "Status aktif pengguna diperbarui." });
    }

    if (action === "reply_complaint") {
      await env.DB.prepare("UPDATE complaints SET admin_reply = ?, status = 'resolved' WHERE id = ?")
        .bind(body.reply, body.id)
        .run();
      return jsonResponse({ ok: true, message: "Balasan keluhan dikirim." });
    }

    if (action === "clean_dummy") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM chat_messages WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM reviews WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM complaints WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM orders WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM service_addons WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM services WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM mitra_profiles WHERE is_dummy = 1"),
        env.DB.prepare("DELETE FROM users WHERE is_dummy = 1 AND role != 'superadmin'"),
      ]);
      return jsonResponse({ ok: true, message: "Seluruh data dummy berhasil dibersihkan!" });
    }

    return jsonResponse({ error: "Aksi Superadmin tidak dikenal." }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
