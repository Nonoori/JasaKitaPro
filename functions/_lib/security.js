// Utilitas Keamanan Web Crypto API (Cloudflare Workers/Pages Native)
// Mengamankan Password (PBKDF2), Token Sesi (HMAC-SHA256), Privasi WA/Alamat (AES-GCM), & Jarak Haversine

const enc = new TextEncoder();
const dec = new TextDecoder();

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

// Hash Password PBKDF2-SHA256
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `PBKDF2$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // Dukungan akun demo awal
  if (storedHash.startsWith("DEMO:")) {
    return password === storedHash.slice(5);
  }
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "PBKDF2") return false;
  const salt = new Uint8Array(parts[1].match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex === parts[2];
}

// SHA-256 untuk lookup unik nomor WA tanpa menyimpan plain-text
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalisasi Nomor WhatsApp Indonesia -> 628xxx
export function normalizePhone(phone) {
  let clean = String(phone || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("08")) clean = "62" + clean.slice(1);
  if (clean.startsWith("8")) clean = "62" + clean;
  return clean;
}

export function maskPhone(phone) {
  const clean = normalizePhone(phone);
  if (clean.length < 8) return "08**-****-****";
  const local = "0" + clean.slice(2);
  return `${local.slice(0, 4)}-****-${local.slice(-4)}`;
}

// Enkripsi AES-GCM untuk melindungi Nomor WA & Alamat User/Mitra
async function getAesKey(secret) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret || "default_jasakita_aes_secret_2026"));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptField(plainText, secret) {
  if (!plainText) return "";
  const key = await getAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipher)));
  return `AES:${ivB64}:${ctB64}`;
}

export async function decryptField(cipherText, secret) {
  if (!cipherText) return "";
  if (cipherText.startsWith("ENC:")) return cipherText.slice(4);
  if (!cipherText.startsWith("AES:")) return cipherText;
  try {
    const [, ivB64, ctB64] = cipherText.split(":");
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
    const key = await getAesKey(secret);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return dec.decode(plain);
  } catch {
    return "[Data Terenkripsi]";
  }
}

// JWT HMAC-SHA256 Sederhana & Aman
export async function signJwt(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 })).replace(/=/g, "");
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret || "jasakita_jwt_secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${data}.${sigB64}`;
}

export async function verifyJwt(token, secret) {
  if (!token) return null;
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const key = await crypto.subtle.importKey("raw", enc.encode(secret || "jasakita_jwt_secret"), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAuthCookie(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/jk_session=([^;]+)/);
  return match ? match[1] : null;
}

// Kalkulasi Jarak Real-Time (Haversine KM)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Kirim Notifikasi WhatsApp Gateway
export async function sendWhatsAppMessage(env, targetPhone, message) {
  const cleanPhone = normalizePhone(targetPhone);
  if (!cleanPhone || !env.WA_GATEWAY_URL || !env.WA_GATEWAY_TOKEN) {
    return { sent: false, reason: "WA Gateway belum dikonfigurasi di Environment Variables", preview: message };
  }
  try {
    const res = await fetch(env.WA_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: env.WA_GATEWAY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: cleanPhone, message }),
    });
    const data = await res.json().catch(() => ({}));
    return { sent: res.ok, data };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}
