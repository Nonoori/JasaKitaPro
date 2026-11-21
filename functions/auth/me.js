import { jsonResponse, decryptField } from "../../_lib/security.js";

export async function onRequestGet({ data, env }) {
  if (!data.user) {
    return jsonResponse({ authenticated: false }, 200);
  }
  const user = await env.DB.prepare(
    "SELECT id, role, full_name, email, phone_encrypted, phone_masked, address_encrypted, address_area, lat, lng, avatar_url, is_verified, complaint_note FROM users WHERE id = ?"
  )
    .bind(data.user.id)
    .first();

  if (!user) return jsonResponse({ authenticated: false }, 200);

  const phone_plain = await decryptField(user.phone_encrypted, env.ENCRYPTION_SECRET);
  const address_plain = await decryptField(user.address_encrypted, env.ENCRYPTION_SECRET);

  return jsonResponse({
    authenticated: true,
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      phone_plain,
      phone_masked: user.phone_masked,
      address_plain,
      address_area: user.address_area,
      lat: user.lat,
      lng: user.lng,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      complaint_note: user.complaint_note,
    },
  });
}
