/**
 * Outbound webhooks.
 *
 * Replaces the `no_webhooks` gap. Secrets are stored as a SHA-256 hash (the
 * plaintext is never persisted) and delivery is idempotent on
 * (endpoint, idempotencyKey), so a retried emit cannot double-deliver. Each
 * emit performs the outbound POST inline and records the result (status,
 * attempts, lastError, deliveredAt); failed deliveries keep their attempt
 * count and last error rather than vanishing.
 *
 * Signature: the receiver gets
 *   X-Studio-Signature: v1=<hex>
 * where hex = HMAC-SHA256(secret_hash, `${timestamp}.${body}`) and secret_hash
 * is SHA-256(plaintext secret the endpoint was registered with). A receiver
 * holding the plaintext secret computes SHA-256(secret), then the HMAC, and
 * compares in constant time.
 */
const express = require('express');
const crypto = require('crypto');

function sha256(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }

function sign(secretHash, timestamp, body) {
  return crypto.createHmac('sha256', secretHash).update(`${timestamp}.${body}`).digest('hex');
}

const DELIVERY_TIMEOUT_MS = Math.max(500, Number(process.env.WEBHOOK_TIMEOUT_MS) || 5000);

async function deliver(endpoint, body, deliveryId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIDanceStudioManager-Webhooks/1.0',
        'X-Studio-Event': endpoint.event_type,
        'X-Studio-Delivery': String(deliveryId),
        'X-Studio-Timestamp': String(timestamp),
        'X-Studio-Signature': `v1=${sign(endpoint.secret_hash, timestamp, body)}`,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, error: `endpoint responded ${response.status}` };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error.name === 'AbortError' ? `delivery timed out after ${DELIVERY_TIMEOUT_MS}ms` : (error.message || 'delivery failed') };
  } finally {
    clearTimeout(timer);
  }
}

function createWebhooksRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      secret_hash TEXT NOT NULL,
      event_type TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id SERIAL PRIMARY KEY,
      endpoint_id INTEGER NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMP,
      UNIQUE (endpoint_id, idempotency_key)
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  router.post('/webhooks/endpoints', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { url, eventType, secret } = req.body || {};
      if (!url || !/^https?:\/\//.test(String(url))) return res.status(400).json({ error: 'url must be http(s)' });
      if (!eventType || !String(eventType).trim()) return res.status(400).json({ error: 'eventType is required' });
      if (!secret || String(secret).length < 16) return res.status(400).json({ error: 'secret must be at least 16 characters' });
      const r = await pool.query(
        `INSERT INTO webhook_endpoints (url, secret_hash, event_type) VALUES ($1,$2,$3)
         RETURNING id, url, event_type, is_active, created_at`,
        [String(url), sha256(secret), String(eventType).trim()],
      );
      res.status(201).json({
        endpoint: r.rows[0],
        note: 'Secret stored as a SHA-256 hash and cannot be recovered. Deliveries sign the body with HMAC-SHA256 keyed by that hash: X-Studio-Signature: v1=hex where hex = HMAC-SHA256(SHA-256(secret), "<timestamp>.<body>").',
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to register endpoint' }); }
  });

  router.post('/webhooks/emit', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { eventType, payload, idempotencyKey } = req.body || {};
      if (!eventType || !String(eventType).trim()) return res.status(400).json({ error: 'eventType is required' });
      const key = String(idempotencyKey ?? `${eventType}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`);
      const eps = await pool.query(
        `SELECT id, url, secret_hash, event_type FROM webhook_endpoints WHERE event_type = $1 AND is_active = true`,
        [String(eventType).trim()],
      );
      if (!eps.rows.length) return res.json({ queued: 0, delivered: 0, failed: 0, deliveries: [], note: 'No active endpoint registered for this event type.' });

      const body = JSON.stringify(payload ?? {});
      const deliveries = [];
      for (const ep of eps.rows) {
        const inserted = await pool.query(
          `INSERT INTO webhook_deliveries (endpoint_id, event_type, payload, idempotency_key)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (endpoint_id, idempotency_key) DO UPDATE SET event_type = EXCLUDED.event_type
           RETURNING id, endpoint_id, event_type, status, attempts, idempotency_key`,
          [ep.id, String(eventType).trim(), body, key],
        );
        const delivery = inserted.rows[0];

        if (delivery.status === 'delivered') {
          deliveries.push({ ...delivery, url: ep.url, replayed: true });
          continue;
        }

        const result = await deliver(ep, body, delivery.id);
        const updated = await pool.query(
          `UPDATE webhook_deliveries
              SET status = $1, attempts = attempts + 1, last_error = $2,
                  delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END
            WHERE id = $3
            RETURNING id, endpoint_id, event_type, status, attempts, last_error, delivered_at, idempotency_key`,
          [result.ok ? 'delivered' : 'failed', result.error, delivery.id],
        );
        deliveries.push({ ...updated.rows[0], url: ep.url });
      }

      const delivered = deliveries.filter((d) => d.status === 'delivered').length;
      const failed = deliveries.filter((d) => d.status === 'failed').length;
      res.status(202).json({
        queued: deliveries.length,
        delivered,
        failed,
        deliveries,
        idempotencyKey: key,
        note: 'Deliveries were attempted against each active endpoint. Replaying the same idempotencyKey does not deliver again once a delivery is marked delivered.',
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to deliver webhook' }); }
  });

  router.get('/webhooks/deliveries', authMiddleware, async (_req, res) => {
    try {
      await ensure();
      const r = await pool.query(
        `SELECT d.*, e.url FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id = d.endpoint_id
          ORDER BY d.created_at DESC LIMIT 200`);
      res.json({ deliveries: r.rows });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list deliveries' }); }
  });

  return router;
}
module.exports = createWebhooksRouter;
