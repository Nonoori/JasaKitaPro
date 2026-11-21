import { getAuthCookie, verifyJwt, jsonResponse } from "./_lib/security.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Ekstrak sesi jika ada
  const token = getAuthCookie(request);
  const user = token ? await verifyJwt(token, env.JWT_SECRET) : null;
  context.data.user = user;

  // Proteksi rute API khusus Superadmin
  if (path.startsWith("/api/superadmin")) {
    if (!user || user.role !== "superadmin") {
      return jsonResponse({ error: "Akses ditolak. Khusus Superadmin." }, 403);
    }
  }

  // Proteksi rute API khusus Mitra
  if (path.startsWith("/api/mitra")) {
    if (!user || (user.role !== "mitra" && user.role !== "superadmin")) {
      return jsonResponse({ error: "Akses ditolak. Silakan login sebagai Mitra." }, 403);
    }
  }

  // Proteksi rute API User terautentikasi
  if (path.startsWith("/api/user") || path.startsWith("/api/chat") || path.startsWith("/api/orders")) {
    if (!user) {
      return jsonResponse({ error: "Silakan login terlebih dahulu." }, 401);
    }
  }

  return next();
}
