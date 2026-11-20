import { jsonResponse, decryptField, encryptField, normalizePhone, maskPhone, sha256Hex } from "../../_lib/security.js";

export async function onRequestGet({ data, env }) {
  const userId = data.user.id;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  let profile = await env.DB.prepare("SELECT * FROM mitra_profiles WHERE user_id = ?").bind(userId).first();

  if (!profile) {
    await env.DB.prepare("INSERT INTO mitra_profiles (user_id, business_name) VALUES (?, ?)")
      .bind(userId, `Jasa ${user.full_name}`)
      .run();
    profile = await env.DB.prepare("SELECT * FROM mitra_profiles WHERE user_id = ?").bind(userId).first();
  }

  const services = await env.DB.prepare(
    `SELECT s.*, c.name AS category_name, c.icon AS category_icon
     FROM services s JOIN service_categories c ON s.category_id = c.id
     WHERE s.mitra_id = ? ORDER BY s.id DESC`
  )
    .bind(userId)
    .all();

  const addons = await env.DB.prepare(
    `SELECT a.* FROM service_addons a JOIN services s ON a.service_id = s.id WHERE s.mitra_id = ?`
  )
    .bind(userId)
    .all();

  const categories = await env.DB.prepare("SELECT * FROM service_categories WHERE is_active = 1").all();

  const phone = await decryptField(user.phone_encrypted, env.ENCRYPTION_SECRET);
  const address = await decryptField(user.address_encrypted, env.ENCRYPTION_SECRET);

  return jsonResponse({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone,
      phone_masked: user.phone_masked,
      address,
      address_area: user.address_area,
    },
    profile: {
      ...profile,
      skills: JSON.parse(profile.skills_json || "[]"),
      certifications: JSON.parse(profile.certifications_json || "[]"),
    },
    services: services.results || [],
    addons: addons.results || [],
    categories: categories.results || [],
  });
}

export async function onRequestPost({ request, data, env }) {
  // CRUD Mitra: update_profile, save_service, delete_service, save_addon, delete_addon
  try {
    const body = await request.json();
    const { action } = body;
    const userId = data.user.id;

    if (action === "update_profile") {
      const {
        business_name,
        slogan,
        business_photo,
        bio,
        skills = [],
        certifications = [],
        solutions_offered,
        service_radius_km = 5,
        phone,
        address,
        address_area,
        verification_doc_url,
      } = body;

      if (phone) {
        const clean = normalizePhone(phone);
        await env.DB.prepare("UPDATE users SET phone_encrypted = ?, phone_hash = ?, phone_masked = ? WHERE id = ?")
          .bind(await encryptField(clean, env.ENCRYPTION_SECRET), await sha256Hex(clean), maskPhone(clean), userId)
          .run();
      }
      if (address !== undefined || address_area) {
        await env.DB.prepare("UPDATE users SET address_encrypted = ?, address_area = ? WHERE id = ?")
          .bind(await encryptField(address || "", env.ENCRYPTION_SECRET), address_area || "Bukittinggi", userId)
          .run();
      }

      await env.DB.prepare(
        `UPDATE mitra_profiles SET
          business_name = ?, slogan = ?, business_photo = ?, bio = ?,
          skills_json = ?, certifications_json = ?, solutions_offered = ?,
          service_radius_km = ?, verification_doc_url = COALESCE(?, verification_doc_url)
         WHERE user_id = ?`
      )
        .bind(
          business_name,
          slogan,
          business_photo || "",
          bio || "",
          JSON.stringify(skills),
          JSON.stringify(certifications),
          solutions_offered || "",
          Number(service_radius_km),
          verification_doc_url || null,
          userId
        )
        .run();

      return jsonResponse({ ok: true, message: "Profil bisnis & keahlian mitra berhasil diamankan & disimpan." });
    }

    if (action === "save_service") {
      const {
        id,
        category_id,
        title,
        service_type,
        service_class,
        price,
        price_unit,
        duration_minutes,
        description,
        solution_detail,
        subscription_days,
      } = body;

      if (id) {
        await env.DB.prepare(
          `UPDATE services SET category_id=?, title=?, service_type=?, service_class=?, price=?, price_unit=?,
           duration_minutes=?, description=?, solution_detail=?, subscription_days=? WHERE id=? AND mitra_id=?`
        )
          .bind(
            category_id,
            title,
            service_type,
            service_class,
            Number(price),
            price_unit,
            Number(duration_minutes || 60),
            description,
            solution_detail || "",
            subscription_days || null,
            id,
            userId
          )
          .run();
      } else {
        await env.DB.prepare(
          `INSERT INTO services (mitra_id, category_id, title, service_type, service_class, price, price_unit, duration_minutes, description, solution_detail, subscription_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            userId,
            category_id,
            title,
            service_type,
            service_class || "Reguler",
            Number(price),
            price_unit || "per sesi",
            Number(duration_minutes || 60),
            description,
            solution_detail || "",
            subscription_days || null
          )
          .run();
      }
      return jsonResponse({ ok: true, message: "Detail jasa & harga berhasil disimpan." });
    }

    if (action === "delete_service") {
      await env.DB.prepare("DELETE FROM services WHERE id = ? AND mitra_id = ?").bind(body.id, userId).run();
      return jsonResponse({ ok: true, message: "Jasa dihapus." });
    }

    if (action === "save_addon") {
      const { service_id, addon_name, addon_price, addon_desc } = body;
      await env.DB.prepare(
        "INSERT INTO service_addons (service_id, addon_name, addon_price, addon_desc) VALUES (?, ?, ?, ?)"
      )
        .bind(service_id, addon_name, Number(addon_price), addon_desc || "")
        .run();
      return jsonResponse({ ok: true, message: "Jasa Add-on berhasil ditambahkan." });
    }

    if (action === "delete_addon") {
      await env.DB.prepare("DELETE FROM service_addons WHERE id = ?").bind(body.id).run();
      return jsonResponse({ ok: true, message: "Add-on dihapus." });
    }

    return jsonResponse({ error: "Aksi mitra tidak valid." }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
