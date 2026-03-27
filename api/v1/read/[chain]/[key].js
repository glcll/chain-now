const { createPublicClient, http, stringToHex, hexToString, decodeAbiParameters } = require("viem");
const { getChain } = require("../../../../lib/chains");

const DATA_REGISTRY_ABI = [
  {
    inputs: [{ name: "key", type: "bytes32" }],
    name: "getEntry",
    outputs: [
      { name: "value", type: "bytes" },
      { name: "timestamp", type: "uint256" },
      { name: "workflowId", type: "bytes32" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { chain, key } = req.query;

  if (!chain || !key) {
    return res.status(400).json({ error: "Missing chain or key parameter." });
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
      error: `DataRegistry not deployed on '${chain}' yet.`,
    });
  }

  if (!chainInfo.rpcUrl) {
    return res.status(500).json({
      error: `No RPC URL configured for '${chain}'.`,
    });
  }

  try {
    const client = createPublicClient({
      transport: http(chainInfo.rpcUrl),
    });

    const keyBytes32 = stringToHex(key, { size: 32 });

    const result = await client.readContract({
      address: chainInfo.registryAddress,
      abi: DATA_REGISTRY_ABI,
      functionName: "getEntry",
      args: [keyBytes32],
    });

    const [valueBytes, timestamp, workflowId, exists] = result;

    if (!exists) {
      return res.status(404).json({
        chain,
        chainName: chainInfo.name,
        key,
        exists: false,
        message: `No data found for key '${key}' on ${chainInfo.name}.`,
      });
    }

    let decodedValue;
    try {
      const valueStr = new TextDecoder().decode(
        Uint8Array.from(Buffer.from(valueBytes.slice(2), "hex"))
      );
      try {
        decodedValue = JSON.parse(valueStr);
      } catch {
        decodedValue = valueStr;
      }
    } catch {
      decodedValue = valueBytes;
    }

    return res.status(200).json({
      chain,
      chainName: chainInfo.name,
      key,
      value: decodedValue,
      rawValue: valueBytes,
      timestamp: Number(timestamp),
      timestampISO: new Date(Number(timestamp) * 1000).toISOString(),
      workflowId,
      exists: true,
    });
  } catch (err) {
    console.error("Read error:", err);
    return res.status(500).json({
      error: "Failed to read from DataRegistry contract.",
      details: err.message,
    });
  }
};
