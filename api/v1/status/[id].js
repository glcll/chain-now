const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing transaction ID." });
  }

  try {
    const record = await kvGet(`write:${id}`);
    if (!record) {
      return res.status(404).json({ error: `Transaction '${id}' not found.` });
    }

    return res.status(200).json({
      txId: record.txId,
      chain: record.chain,
      chainName: record.chainName,
      key: record.key,
      status: record.status,
      txHash: record.txHash,
      explorerUrl: record.explorerUrl,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    console.error("Status lookup error:", err);
    return res.status(500).json({ error: "Failed to retrieve transaction status." });
  }
};
