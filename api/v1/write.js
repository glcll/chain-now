import { getChain, explorerTxUrl } from "../../lib/chains.js";
import { triggerWorkflow } from "../../lib/cre-trigger.js";

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

function generateTxId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "tx_";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
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

  const { chain, key, value } = req.body || {};

  if (!chain || typeof chain !== "string") {
    return res.status(400).json({
      error: "Missing or invalid 'chain'. Provide a chain slug like 'ethereum-sepolia'.",
      hint: "GET /api/v1/chains for available chains.",
    });
  }

  if (!key || typeof key !== "string") {
    return res.status(400).json({
      error: "Missing or invalid 'key'. Provide a string key for your data.",
    });
  }

  if (key.length > 31) {
    return res.status(400).json({
      error: "Key too long. Maximum 31 characters (must fit in bytes32).",
    });
  }

  if (value === undefined || value === null) {
    return res.status(400).json({
      error: "Missing 'value'. Provide the data to write onchain.",
    });
  }

  const chainInfo = getChain(chain);
  if (!chainInfo) {
    return res.status(400).json({
      error: `Unknown chain: '${chain}'.`,
      hint: "GET /api/v1/chains for available chains.",
    });
  }

  if (!chainInfo.registryAddress) {
    return res.status(400).json({
      error: `Chain '${chain}' is supported but the DataRegistry contract has not been deployed yet.`,
    });
  }

  const valueStr = typeof value === "string" ? value : JSON.stringify(value);
  const txId = generateTxId();

  const record = {
    txId,
    chain,
    chainName: chainInfo.name,
    key,
    value: valueStr,
    status: "pending",
    txHash: null,
    explorerUrl: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await kvSet(`write:${txId}`, record, 86400);
  } catch (err) {
    console.error("KV store error:", err);
    return res.status(500).json({ error: "Failed to store write request." });
  }

  const creConfigured =
    process.env.CRE_WORKFLOW_ID &&
    !process.env.CRE_WORKFLOW_ID.startsWith("PLACEHOLDER");

  if (!creConfigured) {
    record.status = "failed";
    record.errorMessage = "CRE workflow not deployed yet. The write pipeline is being set up.";
    try { await kvSet(`write:${txId}`, record, 86400); } catch (_) {}
    return res.status(503).json({
      error: "CRE workflow not deployed yet. The write pipeline is being set up.",
      txId,
    });
  }

  const workflowPayload = {
    txId,
    chain: chainInfo.selectorName,
    key,
    value: valueStr,
    webhookSecret: WEBHOOK_SECRET,
  };

  triggerWorkflow(workflowPayload).catch((err) => {
    console.error(`Failed to trigger CRE workflow for ${txId}:`, err);
  });

  return res.status(202).json({
    txId,
    chain,
    chainName: chainInfo.name,
    key,
    status: "pending",
    statusUrl: `${BASE_URL}/api/v1/status/${txId}`,
    readUrl: `${BASE_URL}/api/v1/read/${chain}/${encodeURIComponent(key)}`,
  });
}
