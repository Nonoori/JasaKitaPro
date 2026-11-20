import {
  jsonResponse,
  calculateDistanceKm,
  decryptField,
  sendWhatsAppMessage,
} from "../../_lib/security.js";

export async function onRequestGet({ data, env }) {
  const userId = data.user.id;
  const role = data.user.role;

  let sql = `
    SELECT o.*, s.title AS service_title, s.service_type, s.service_class, s.price_unit,
           u.full_name AS customer_name, u.phone_masked AS customer_phone_masked,
           m.full_name AS mitra_name, mp.business_name,
           r.rating AS review_rating, r.comment AS review_comment
    FROM orders o
    JOIN services s ON o.service_id = s.id
    JOIN users u ON o.user_id = u.id
    JOIN users m ON o.mitra_id = m.id
    LEFT JOIN mitra_profiles mp ON mp.user_id = m.id
    LEFT JOIN reviews r ON r.order_id = o.id
  `;
  const binds = [];
  if (role === "user") {
    sql += " WHERE o.user_id = ?";
    binds.push(userId);
  } else if (role === "mitra") {
    sql += " WHERE o.mitra_id = ?";
    binds.push(userId);
  }
  sql += " ORDER BY o.id DESC";

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return jsonResponse({ orders: rows.results || [] });
}

export async function onRequestPost({ request, data, env }) {
  // Buat Pesanan Baru + Midtrans Snap Token + Notifikasi WA
  try {
    const body = await request.json();
    const {
      service_id,
      addon_ids = [],
      schedule_date,
      schedule_time,
      timing_notes = "Sesuai jadwal tertera",
      payment_method = "midtrans",
    } = body;

    if (!service_id || !schedule_date || !schedule_time) {
      return jsonResponse({ error: "Pilih tanggal dan jam jadwal layanan." }, 400);
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(data.user.id).first();
    const service = await env.DB.prepare(
      `SELECT s.*, m.lat AS mitra_lat, m.lng AS mitra_lng, m.phone_encrypted AS mitra_phone, m.full_name AS mitra_name
       FROM services s JOIN users m ON s.mitra_id = m.id WHERE s.id = ?`
    )
      .bind(service_id)
      .first();

    if (!service) return jsonResponse({ error: "Layanan tidak ditemukan." }, 404);

    let addonTotal = 0;
    const addonsSelected = [];
    if (Array.isArray(addon_ids) && addon_ids.length > 0) {
      for (const aid of addon_ids) {
        const ad = await env.DB.prepare("SELECT * FROM service_addons WHERE id = ? AND service_id = ?")
          .bind(aid, service_id)
          .first();
        if (ad) {
          addonTotal += ad.addon_price;
          addonsSelected.push({ id: ad.id, name: ad.addon_name, price: ad.addon_price });
        }
      }
    }

    const distanceKm = calculateDistanceKm(user.lat, user.lng, service.mitra_lat, service.mitra_lng);
    const adminFee = 2500;
    const totalAmount = service.price + addonTotal + adminFee;
    const orderCode = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    let midtransToken = null;
    let midtransRedirectUrl = null;

    // Integrasi Midtrans Snap API
    if (payment_method === "midtrans" && env.MIDTRANS_SERVER_KEY) {
      const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
      const snapUrl = isProd
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const authHeader = "Basic " + btoa(env.MIDTRANS_SERVER_KEY + ":");
      const snapRes = await fetch(snapUrl, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          transaction_details: { order_id: orderCode, gross_amount: totalAmount },
          customer_details: { first_name: user.full_name, email: user.email || "user@jasakita.id" },
        }),
      });
      const snapData = await snapRes.json().catch(() => ({}));
      midtransToken = snapData.token || null;
      midtransRedirectUrl = snapData.redirect_url || null;
    }

    const initialLog = JSON.stringify([
      { time: new Date().toLocaleString("id-ID"), status: "Pesanan Dibuat & Menunggu Konfirmasi" },
    ]);

    const ins = await env.DB.prepare(
      `INSERT INTO orders (
        order_code, user_id, mitra_id, service_id, addons_selected_json,
        schedule_date, schedule_time, timing_notes, distance_km,
        service_address_encrypted, service_address_area,
        subtotal, addon_total, admin_fee, total_amount,
        payment_method, payment_status, midtrans_token, midtrans_redirect_url,
        order_status, process_log_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        orderCode,
        user.id,
        service.mitra_id,
        service.id,
        JSON.stringify(addonsSelected),
        schedule_date,
        schedule_time,
        timing_notes,
        distanceKm,
        user.address_encrypted,
        user.address_area,
        service.price,
        addonTotal,
        adminFee,
        totalAmount,
        payment_method,
        payment_method === "cod_terpercaya" ? "unpaid" : "unpaid",
        midtransToken,
        midtransRedirectUrl,
        payment_method === "cod_terpercaya" ? "dikonfirmasi" : "menunggu_pembayaran",
        initialLog
      )
      .run();

    // Kirim Notifikasi WA ke Mitra (tanpa membocorkan nomor WA pribadi user)
    const mitraPhone = await decryptField(service.mitra_phone, env.ENCRYPTION_SECRET);
    await sendWhatsAppMessage(
      env,
      mitraPhone,
      `🔔 *Pesanan Baru JasaKita Pro!*
Kode: *${orderCode}*
Layanan: ${service.title}
Jadwal: ${schedule_date} pukul ${schedule_time}
Jarak: ~${distanceKm} km (${user.address_area})
Total: Rp${totalAmount.toLocaleString("id-ID")}
Silakan buka Dashboard Mitra & gunakan Chat Aman.`
    );

    return jsonResponse({
      ok: true,
      order_id: ins.meta.last_row_id,
      order_code: orderCode,
      total_amount: totalAmount,
      distance_km: distanceKm,
      midtrans_token: midtransToken,
      midtrans_redirect_url: midtransRedirectUrl,
      message: "Pesanan berhasil dibuat!",
    });
  } catch (err) {
    return jsonResponse({ error: "Gagal membuat pesanan: " + err.message }, 500);
  }
}

export async function onRequestPut({ request, data, env }) {
  // Update Status Proses Pengerjaan / Simulasi Bayar / Kirim Review Bintang
  try {
    const body = await request.json();
    const { order_id, action, new_status, rating, comment } = body;

    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(order_id).first();
    if (!order) return jsonResponse({ error: "Pesanan tidak ditemukan." }, 404);

    if (action === "pay_confirm") {
      const logs = JSON.parse(order.process_log_json || "[]");
      logs.push({ time: new Date().toLocaleString("id-ID"), status: "Pembayaran Terverifikasi (Midtrans)" });
      await env.DB.prepare(
        "UPDATE orders SET payment_status = 'paid', order_status = 'dikonfirmasi', process_log_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
        .bind(JSON.stringify(logs), order_id)
        .run();
      return jsonResponse({ ok: true, message: "Pembayaran terkonfirmasi!" });
    }

    if (action === "update_status" && new_status) {
      const logs = JSON.parse(order.process_log_json || "[]");
      const labelMap = {
        dikonfirmasi: "Mitra Mengonfirmasi Jadwal",
        mitra_menuju_lokasi: "Mitra Sedang Menuju Lokasi Anda",
        sedang_dikerjakan: "Layanan Sedang Dikerjakan",
        selesai: "Pekerjaan Selesai & Terverifikasi",
        dibatalkan: "Pesanan Dibatalkan",
      };
      logs.push({ time: new Date().toLocaleString("id-ID"), status: labelMap[new_status] || new_status });

      await env.DB.prepare(
        "UPDATE orders SET order_status = ?, payment_status = CASE WHEN ? = 'selesai' THEN 'paid' ELSE payment_status END, process_log_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
        .bind(new_status, new_status, JSON.stringify(logs), order_id)
        .run();

      if (new_status === "selesai") {
        await env.DB.prepare(
          "UPDATE mitra_profiles SET total_orders_completed = total_orders_completed + 1 WHERE user_id = ?"
        )
          .bind(order.mitra_id)
          .run();
      }
      return jsonResponse({ ok: true, message: "Status pesanan diperbarui." });
    }

    if (action === "review") {
      if (order.user_id !== data.user.id) return jsonResponse({ error: "Bukan pesanan Anda." }, 403);
      const stars = Math.min(5, Math.max(1, Number(rating || 5)));
      await env.DB.prepare(
        "INSERT OR REPLACE INTO reviews (order_id, user_id, mitra_id, rating, comment) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(order_id, data.user.id, order.mitra_id, stars, comment || "Pelayanan sangat memuaskan.")
        .run();

      // Hitung ulang rata-rata bintang mitra
      const agg = await env.DB.prepare(
        "SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE mitra_id = ?"
      )
        .bind(order.mitra_id)
        .first();
      await env.DB.prepare("UPDATE mitra_profiles SET rating_avg = ?, total_reviews = ? WHERE user_id = ?")
        .bind(Math.round((agg.avg_r || 5) * 100) / 100, agg.cnt || 1, order.mitra_id)
        .run();

      return jsonResponse({ ok: true, message: "Terima kasih atas ulasan & bintang Anda!" });
    }

    return jsonResponse({ error: "Aksi tidak dikenali." }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
