import { jsonResponse, calculateDistanceKm, encryptField, decryptField } from "../../_lib/security.js";

export async function onRequestGet({ request, data, env }) {
  const url = new URL(request.url);
  const partnerId = Number(url.searchParams.get("partner_id") || 0);
  const myId = data.user.id;

  if (!partnerId) {
    // Daftar ruang percakapan user/mitra
    const rooms = await env.DB.prepare(
      `SELECT DISTINCT
         CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
       FROM chat_messages WHERE sender_id = ? OR receiver_id = ?`
    )
      .bind(myId, myId, myId)
      .all();

    const list = [];
    for (const r of rooms.results || []) {
      const p = await env.DB.prepare(
        `SELECT u.id, u.full_name, u.role, u.address_area, u.lat, u.lng, mp.business_name, mp.verification_status
         FROM users u LEFT JOIN mitra_profiles mp ON mp.user_id = u.id WHERE u.id = ?`
      )
        .bind(r.partner_id)
        .first();
      const me = await env.DB.prepare("SELECT lat, lng FROM users WHERE id = ?").bind(myId).first();
      if (p) {
        list.push({
          ...p,
          distance_km: calculateDistanceKm(me?.lat, me?.lng, p.lat, p.lng),
        });
      }
    }
    return jsonResponse({ contacts: list });
  }

  const me = await env.DB.prepare("SELECT lat, lng FROM users WHERE id = ?").bind(myId).first();
  const partner = await env.DB.prepare(
    `SELECT u.id, u.full_name, u.role, u.address_area, u.lat, u.lng, mp.business_name, mp.verification_status
     FROM users u LEFT JOIN mitra_profiles mp ON mp.user_id = u.id WHERE u.id = ?`
  )
    .bind(partnerId)
    .first();

  const distanceKm = calculateDistanceKm(me?.lat, me?.lng, partner?.lat, partner?.lng);

  const msgs = await env.DB.prepare(
    `SELECT * FROM chat_messages
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY id ASC LIMIT 100`
  )
    .bind(myId, partnerId, partnerId, myId)
    .all();

  const decryptedMessages = [];
  for (const m of msgs.results || []) {
    decryptedMessages.push({
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      text: await decryptField(m.message_encrypted, env.ENCRYPTION_SECRET),
      distance_info: m.distance_info,
      created_at: m.created_at,
    });
  }

  return jsonResponse({ partner, distance_km: distanceKm, messages: decryptedMessages });
}

export async function onRequestPost({ request, data, env }) {
  try {
    const { receiver_id, text, order_id = null } = await request.json();
    if (!receiver_id || !text?.trim()) {
      return jsonResponse({ error: "Pesan tidak boleh kosong." }, 400);
    }

    // Filter anti-kebocoran nomor WA pribadi sebelum konfirmasi agar privasi aman
    const sanitized = text.replace(/(\+62|62|08)[0-9\s-]{8,14}/g, "[Nomor WA Disamarkan Demi Keamanan]");

    const me = await env.DB.prepare("SELECT lat, lng FROM users WHERE id = ?").bind(data.user.id).first();
    const target = await env.DB.prepare("SELECT lat, lng FROM users WHERE id = ?").bind(receiver_id).first();
    const dist = calculateDistanceKm(me?.lat, me?.lng, target?.lat, target?.lng);

    const userId = data.user.role === "user" ? data.user.id : receiver_id;
    const mitraId = data.user.role === "mitra" ? data.user.id : receiver_id;
    const roomId = `room_user_${userId}_mitra_${mitraId}`;
    const encrypted = await encryptField(sanitized, env.ENCRYPTION_SECRET);

    await env.DB.prepare(
      "INSERT INTO chat_messages (room_id, order_id, sender_id, receiver_id, message_encrypted, distance_info) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(roomId, order_id, data.user.id, receiver_id, encrypted, `${dist} km`)
      .run();

    return jsonResponse({ ok: true, distance_km: dist });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
