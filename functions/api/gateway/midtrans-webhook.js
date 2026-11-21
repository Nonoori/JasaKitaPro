import { jsonResponse, sha256Hex } from "../../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;

    if (env.MIDTRANS_SERVER_KEY && signature_key) {
      const expected = await sha256Hex(`${order_id}${status_code}${gross_amount}${env.MIDTRANS_SERVER_KEY}`);
      if (expected !== signature_key) {
        return jsonResponse({ error: "Invalid Midtrans signature" }, 403);
      }
    }

    const order = await env.DB.prepare("SELECT * FROM orders WHERE order_code = ?").bind(order_id).first();
    if (!order) return jsonResponse({ error: "Order not found" }, 404);

    if (["capture", "settlement"].includes(transaction_status)) {
      const logs = JSON.parse(order.process_log_json || "[]");
      logs.push({ time: new Date().toLocaleString("id-ID"), status: "Pembayaran Lunas via Midtrans Webhook" });
      await env.DB.prepare(
        "UPDATE orders SET payment_status = 'paid', order_status = 'dikonfirmasi', process_log_json = ? WHERE id = ?"
      )
        .bind(JSON.stringify(logs), order.id)
        .run();
    } else if (["expire", "cancel", "deny"].includes(transaction_status)) {
      await env.DB.prepare("UPDATE orders SET payment_status = 'expired', order_status = 'dibatalkan' WHERE id = ?")
        .bind(order.id)
        .run();
    }

    return jsonResponse({ received: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
