import {
  jsonResponse,
  encryptField,
  decryptField,
  normalizePhone,
  maskPhone,
  sha256Hex,
  hashPassword,
  verifyPassword,
} from "../../_lib/security.js";

export async function onRequestGet({ data, env }) {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(data.user.id).first();
  if (!user) return jsonResponse({ error: "User tidak ditemukan" }, 404);

  const phone = await decryptField(user.phone_encrypted, env.ENCRYPTION_SECRET);
  const address = await decryptField(user.address_encrypted, env.ENCRYPTION_SECRET);
  const complaints = await env.DB.prepare("SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC").bind(user.id).all();

  return jsonResponse({
    profile: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      phone,
      phone_masked: user.phone_masked,
      address,
      address_area: user.address_area,
      lat: user.lat,
      lng: user.lng,
      is_verified: user.is_verified,
      complaint_note: user.complaint_note || "",
    },
    complaints: complaints.results || [],
  });
}

export async function onRequestPut({ request, data, env }) {
  try {
    const body = await request.json();
    const { full_name, email, phone, address, address_area, lat, lng, complaint_note, old_password, new_password } = body;

    const current = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(data.user.id).first();
    if (!current) return jsonResponse({ error: "User tidak ditemukan" }, 404);

    let passwordHash = current.password_hash;
    if (new_password) {
      if (!old_password) {
        return jsonResponse({ error: "Masukkan sandi lama untuk mengubah password baru." }, 400);
      }
      const okOld = await verifyPassword(old_password, current.password_hash);
      if (!okOld) return jsonResponse({ error: "Sandi lama tidak cocok." }, 401);
      passwordHash = await hashPassword(new_password);
    }

    let phoneEncrypted = current.phone_encrypted;
    let phoneHash = current.phone_hash;
    let phoneMasked = current.phone_masked;
    if (phone) {
      const clean = normalizePhone(phone);
      phoneEncrypted = await encryptField(clean, env.ENCRYPTION_SECRET);
      phoneHash = await sha256Hex(clean);
      phoneMasked = maskPhone(clean);
    }

    const addressEncrypted = address !== undefined ? await encryptField(address, env.ENCRYPTION_SECRET) : current.address_encrypted;

    await env.DB.prepare(
      `UPDATE users SET
        full_name = ?, email = ?, phone_encrypted = ?, phone_hash = ?, phone_masked = ?,
        address_encrypted = ?, address_area = ?, lat = ?, lng = ?, complaint_note = ?,
        password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        full_name || current.full_name,
        email !== undefined ? email : current.email,
        phoneEncrypted,
        phoneHash,
        phoneMasked,
        addressEncrypted,
        address_area || current.address_area,
        lat !== undefined ? Number(lat) : current.lat,
        lng !== undefined ? Number(lng) : current.lng,
        complaint_note !== undefined ? complaint_note : current.complaint_note,
        passwordHash,
        data.user.id
      )
      .run();

    return jsonResponse({ ok: true, message: "Profil berhasil diperbarui & diamankan enkripsi." });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function onRequestPost({ request, data, env }) {
  // Tambah Tiket Keluhan / Masalah ke Superadmin
  try {
    const { order_id = null, subject, description } = await request.json();
    if (!subject || !description) {
      return jsonResponse({ error: "Judul keluhan dan kronologi masalah wajib diisi." }, 400);
    }
    const ticketCode = `TKT-${Date.now().toString().slice(-6)}`;
    await env.DB.prepare(
      "INSERT INTO complaints (ticket_code, user_id, order_id, subject, description) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(ticketCode, data.user.id, order_id, subject, description)
      .run();

    return jsonResponse({ ok: true, ticket_code: ticketCode, message: "Keluhan tercatat & diteruskan ke Superadmin." });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
