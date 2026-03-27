import { explorerTxUrl } from "../../lib/chains.js";

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function kvGet(key) {
  const res = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return data.result;
  }
}

async function kvSet(key, value, ttlSeconds) {
  const url = `${KV_REST_API_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`;
  const finalUrl = ttlSeconds ? `${url}?EX=${ttlSeconds}` : url;
  const res = await fetch(finalUrl, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const secret = req.headers["x-webhook-secret"];
  if (!secret || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { txId, status, txHash, errorMessage } = req.body || {};

  if (!txId || !status) {
    return res.status(400).json({ error: "Missing txId or status." });
  }

  try {
    const record = await kvGet(`write:${txId}`);
    if (!record) {
      return res.status(404).json({ error: `Transaction '${txId}' not found.` });
    }

    record.status = status;
    record.txHash = txHash || record.txHash;
    record.explorerUrl = txHash ? explorerTxUrl(record.chain, txHash) : record.explorerUrl;
    record.errorMessage = errorMessage || record.errorMessage;
    record.updatedAt = new Date().toISOString();

    await kvSet(`write:${txId}`, record, 86400 * 7);

    return res.status(200).json({ success: true, txId, status });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Failed to process webhook." });
  }
}
