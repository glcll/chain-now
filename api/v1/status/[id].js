import { createPublicClient, http, stringToHex, getAddress, parseAbiItem } from "viem";
import { getChain, explorerTxUrl } from "../../../lib/chains.js";

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

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

const DATA_WRITTEN_EVENT = parseAbiItem(
  "event DataWritten(bytes32 indexed key, bytes value, uint256 timestamp, bytes32 workflowId)"
);

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

async function checkOnchain(record) {
  const chainInfo = getChain(record.chain);
  if (!chainInfo?.rpcUrl || !chainInfo?.registryAddress) return null;

  try {
    const client = createPublicClient({ transport: http(chainInfo.rpcUrl) });
    const keyBytes32 = stringToHex(record.key, { size: 32 });
    const checksumAddr = getAddress(chainInfo.registryAddress);

    const result = await client.readContract({
      address: checksumAddr,
      abi: DATA_REGISTRY_ABI,
      functionName: "getEntry",
      args: [keyBytes32],
    });

    const [, timestamp, , exists] = result;
    if (!exists) return null;

    let txHash = null;
    try {
      const blockNumber = await client.getBlockNumber();
      const lookbackBlocks = 5000n;
      const fromBlock = blockNumber > lookbackBlocks ? blockNumber - lookbackBlocks : 0n;

      const logs = await client.getLogs({
        address: checksumAddr,
        event: DATA_WRITTEN_EVENT,
        args: { key: keyBytes32 },
        fromBlock,
        toBlock: "latest",
      });

      if (logs.length > 0) {
        txHash = logs[logs.length - 1].transactionHash;
      }
    } catch (err) {
      console.error("Event log lookup failed (non-fatal):", err.message);
    }

    return {
      timestamp: Number(timestamp),
      confirmedAt: new Date(Number(timestamp) * 1000).toISOString(),
      txHash,
    };
  } catch (err) {
    console.error("Onchain check failed:", err.message);
    return null;
  }
}

export default async function handler(req, res) {
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

    if (record.status === "pending") {
      const onchainResult = await checkOnchain(record);
      if (onchainResult) {
        record.status = "confirmed";
        record.updatedAt = new Date().toISOString();
        record.onchainTimestamp = onchainResult.confirmedAt;
        if (onchainResult.txHash) {
          record.txHash = onchainResult.txHash;
          record.explorerUrl = explorerTxUrl(record.chain, onchainResult.txHash);
        }
        try {
          await kvSet(`write:${id}`, record, 86400 * 7);
        } catch (_) {}
      }
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
      onchainTimestamp: record.onchainTimestamp || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    console.error("Status lookup error:", err);
    return res.status(500).json({ error: "Failed to retrieve transaction status." });
  }
}
