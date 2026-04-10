---
name: chain-now
description: >-
  Write arbitrary data on-chain via a single REST API call, powered by Chainlink
  CRE. Currently live on 9 testnets with more chains coming soon. Use when
  an agent needs to persist data on-chain, store key/value pairs on a blockchain,
  write agent state on-chain, or interact with Chain Now's API.
license: MIT
compatibility: Claude Code, Cursor, Codex, Windsurf, and any agent supporting https://agentskills.io/specification
allowed-tools: Read WebFetch Write Edit Bash Shell
metadata:
  purpose: On-chain data writes for AI agents via Chain Now API
  version: "1.0"
---

# Chain Now — Instant On-chain Writes for Agents

Write data on-chain with a single HTTP call. No wallets, gas, ABI encoding, or blockchain knowledge required.

> **Currently live on 9 testnets.** The architecture supports 22+ EVM chains — mainnets coming soon.

**Base URL:** `https://chain-now.vercel.app`

## Quick Start

Three steps to write data on-chain:

```bash
# 1. Write
curl -X POST https://chain-now.vercel.app/api/v1/write \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum-sepolia","key":"my-agent","value":{"alive":true}}'

# 2. Track (poll until status != "pending")
curl https://chain-now.vercel.app/api/v1/status/TX_ID

# 3. Read back
curl https://chain-now.vercel.app/api/v1/read/ethereum-sepolia/my-agent
```

## API Reference

### POST /api/v1/write

Write data on-chain. Returns a `txId` for tracking.

**Request body:**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `chain` | string | yes | Chain slug — see Supported Chains section for live chains |
| `key`   | string | yes | Storage key, max 31 chars (stored as `bytes32`) |
| `value` | any    | yes | Any JSON value — objects, strings, numbers, arrays |

**Response (202):**
```json
{
  "txId": "tx_a8f2k9m3x7p1",
  "chain": "ethereum-sepolia",
  "chainName": "Ethereum Sepolia",
  "key": "my-agent",
  "status": "pending",
  "statusUrl": "https://chain-now.vercel.app/api/v1/status/tx_a8f2k9m3x7p1",
  "readUrl": "https://chain-now.vercel.app/api/v1/read/ethereum-sepolia/my-agent"
}
```

**Error codes:** `400` (invalid params), `502` (CRE trigger failed), `503` (workflow not deployed), `429` (rate limited)

### GET /api/v1/status/:txId

Poll transaction status. The endpoint queries the blockchain directly — when data appears on-chain, status transitions from `pending` to `confirmed`.

**Response (200):**
```json
{
  "txId": "tx_a8f2k9m3x7p1",
  "chain": "ethereum-sepolia",
  "status": "confirmed",
  "onchainTimestamp": "2026-03-27T19:36:12.000Z",
  "txHash": null,
  "createdAt": "2026-03-27T19:36:00.360Z"
}
```

**Status values:** `pending` | `confirmed` | `failed`

### GET /api/v1/read/:chain/:key

Read data directly from the on-chain DataRegistry contract.

**Response (200):**
```json
{
  "chain": "ethereum-sepolia",
  "key": "my-agent",
  "value": {"alive": true},
  "timestamp": 1774640172,
  "timestampISO": "2026-03-27T19:36:12.000Z",
  "workflowId": "0x00c0b870...",
  "exists": true
}
```

### GET /api/v1/chains

List supported chains. Add `?testnets=false` to exclude testnets.

## Rate Limits

| Tier | Limit | How |
|------|-------|-----|
| Anonymous | 5 requests/hour | No auth header |
| Authenticated | 60 requests/hour | `Authorization: Bearer <any-token>` |

The `/api/v1/chains` and `/api/v1/webhook` endpoints are not rate-limited.

## Agent Integration Patterns

### Pattern 1: Fire-and-Forget Write

For agents that write data and don't need confirmation:

```python
import requests

requests.post("https://chain-now.vercel.app/api/v1/write", json={
    "chain": "ethereum-sepolia",
    "key": "agent-heartbeat",
    "value": {"ts": "2026-03-27T12:00:00Z", "status": "alive"}
})
```

### Pattern 2: Write-and-Confirm Loop

For agents that need to verify data landed on-chain:

```python
import requests, time

resp = requests.post("https://chain-now.vercel.app/api/v1/write", json={
    "chain": "ethereum-sepolia",
    "key": "agent-result",
    "value": {"score": 42, "model": "gpt-4"}
})
tx_id = resp.json()["txId"]

while True:
    status = requests.get(f"https://chain-now.vercel.app/api/v1/status/{tx_id}").json()
    if status["status"] != "pending":
        break
    time.sleep(10)

print(f"Confirmed on-chain at {status['onchainTimestamp']}")
```

### Pattern 3: Read-After-Write Verification

```bash
# Write, wait, then read back to verify
curl -s https://chain-now.vercel.app/api/v1/read/ethereum-sepolia/agent-result | jq .value
```

## Supported Chains

**Live now:**
- **Ethereum Sepolia** — `ethereum-sepolia`
- **Base Sepolia** — `base-sepolia`
- **Arbitrum Sepolia** — `arbitrum-sepolia`
- **OP Sepolia** — `optimism-sepolia`
- **Polygon Amoy** — `polygon-amoy`
- **Avalanche Fuji** — `avalanche-fuji`
- **World Chain Sepolia** — `world-chain-sepolia`
- **Ink Sepolia** — `ink-sepolia`
- **ZKSync Era Sepolia** — `zksync-sepolia`

**Coming soon:** `ethereum`, `arbitrum`, `base`, `optimism`, `polygon`, `avalanche`, `bnb`, `scroll`, `linea`, `sonic`, `world-chain`, `zksync`, `celo`, `gnosis`, `mantle`, `ink`

The architecture supports all 22+ EVM chains in the Chainlink Runtime Environment. Each chain requires a deployed DataRegistry contract. Call `GET /api/v1/chains` for the live list.

## Architecture Overview

```
Agent → REST API (Vercel) → CRE Gateway → Chainlink DON → DataRegistry Contract
                ↕                                              ↕
          Vercel KV (status)                           On-chain storage
```

- **API Gateway**: Vercel serverless functions handle validation, KV tracking, and CRE trigger
- **CRE Workflow**: TypeScript workflow triggered via HTTP, encodes data, generates a signed report, and writes to the DataRegistry via `KeystoneForwarder`
- **DataRegistry**: Solidity contract implementing `IReceiver`, stores `bytes32 key → bytes value` pairs with timestamps and workflow provenance
- **Status Resolution**: The `/status` endpoint queries the blockchain directly to detect confirmed writes

## Building Your Own CRE Integration

For details on how Chain Now was built (CRE workflow, consumer contract, ETH-signed JWT trigger authentication, and gotchas), see [architecture.md](references/architecture.md).

## Key Constraints

- **Key length**: Max 31 characters (must fit in `bytes32`)
- **Value size**: Any JSON, serialized to bytes on-chain (practical limit ~24KB per Ethereum transaction gas limits)
- **Confirmation time**: ~10-30 seconds on Sepolia depending on network conditions
- **Data persistence**: On-chain forever — writes are immutable once confirmed
- **Overwrites**: Writing to the same key on the same chain replaces the previous value
