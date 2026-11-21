import {
  jsonResponse,
  hashPassword,
  sha256Hex,
  normalizePhone,
  maskPhone,
  encryptField,
  signJwt,
  sendWhatsAppMessage,
} from "../../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const {
      role = "user",
      full_name,
      email,
      phone,
      password,
      address_detail,
      address_area,
      lat = -0.3025,
      lng = 100.3720,
      business_name,
      slogan,
    } = body;

    if (!full_name || !phone || !password) {
      return jsonResponse({ error: "Nama lengkap, nomor WhatsApp, dan password wajib diisi." }, 400);
    }
    if (!["user", "mitra"].includes(role)) {
      return jsonResponse({ error: "Role tidak valid." }, 400);
    }

    const cleanPhone = normalizePhone(phone);
    const phoneHash = await sha256Hex(cleanPhone);
    const phoneMasked = maskPhone(cleanPhone);
    const phoneEncrypted = await encryptField(cleanPhone, env.ENCRYPTION_SECRET);
    const addressEncrypted = await encryptField(address_detail || "", env.ENCRYPTION_SECRET);
    const passwordHash = await hashPassword(password);

    const existing = await env.DB.prepare("SELECT id FROM users WHERE phone_hash = ? OR (email IS NOT NULL AND email = ?)")
      .bind(phoneHash, email || "")
      .first();
    if (existing) {
      return jsonResponse({ error: "Nomor WhatsApp atau Email sudah terdaftar." }, 409);
    }

    const res = await env.DB.prepare(
      `INSERT INTO users (role, full_name, email, phone_encrypted, phone_hash, phone_masked, password_hash, address_encrypted, address_area, lat, lng, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        role,
        full_name,
        email || null,
        phoneEncrypted,
        phoneHash,
        phoneMasked,
        passwordHash,
        addressEncrypted,
        address_area || "Bukittinggi",
        Number(lat),
        Number(lng),
        role === "user" ? 1 : 0
      )
      .run();

    const userId = res.meta.last_row_id;

    if (role === "mitra") {
      await env.DB.prepare(
        `INSERT INTO mitra_profiles (user_id, business_name, slogan, verification_status)
         VALUES (?, ?, ?, 'pending')`
      )
        .bind(userId, business_name || `Jasa ${full_name}`, slogan || "Siap Melayani dengan Amanah & Profesional")
        .run();
    }

    // Notifikasi WA Selamat Datang
    await sendWhatsAppMessage(
      env,
      cleanPhone,
      `Halo *${full_name}*, selamat datang di *JasaKita Pro*! Akun ${role.toUpperCase()} Anda aktif. Nomor WA & alamat Anda dilindungi enkripsi sistem.`
    );

    const jwt = await signJwt({ id: userId, role, full_name, address_area: address_area || "Bukittinggi" }, env.JWT_SECRET);

    return jsonResponse(
      { ok: true, user: { id: userId, role, full_name, phone_masked: phoneMasked } },
      201,
      { "Set-Cookie": `jk_session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${86400 * 7}` }
    );
  } catch (err) {
    return jsonResponse({ error: "Gagal mendaftar: " + err.message }, 500);
  }
}
