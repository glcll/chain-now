# chain.now

**Instant onchain writes for agents — powered by [Chainlink CRE](https://docs.chain.link/cre)**

Write data to any EVM chain with a single API call. No wallets, no gas, no ABI encoding. Your agent sends JSON — we put it onchain.

> **Currently live on Ethereum Sepolia and Base Sepolia.** Mainnet and additional chain support is coming soon.

**Live at:** https://chain-now.vercel.app

## Quick Start

```bash
# 1. Write data onchain
curl -X POST https://chain-now.vercel.app/api/v1/write \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum-sepolia","key":"my-agent","value":{"alive":true}}'

# 2. Poll for confirmation (~10-30s)
curl https://chain-now.vercel.app/api/v1/status/TX_ID

# 3. Read it back
curl https://chain-now.vercel.app/api/v1/read/ethereum-sepolia/my-agent
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/write` | Write data onchain. Body: `{ chain, key, value }` |
| `GET` | `/api/v1/status/:txId` | Poll transaction status (`pending` → `confirmed`) |
| `GET` | `/api/v1/read/:chain/:key` | Read data from the onchain DataRegistry |
| `GET` | `/api/v1/chains` | List supported chains and availability |

## Supported Chains

**Live now:**
- Ethereum Sepolia (testnet)
- Base Sepolia (testnet)

**Coming soon:** Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, BNB Chain, Scroll, Linea, Sonic, zkSync Era, World Chain, Celo, Gnosis, Mantle, Ink, and additional testnets.

Each chain requires a deployed DataRegistry contract. See [contracts/DEPLOY.md](contracts/DEPLOY.md) for deployment instructions.

## Architecture

```
Agent ──POST JSON──▸ API Gateway (Vercel) ──ETH-signed JWT──▸ CRE Gateway
                          │                                        │
                     Vercel KV                              Chainlink DON
                    (status tracking)                     (consensus + signing)
                                                               │
                                                    KeystoneForwarder
                                                               │
                                                      DataRegistry Contract
                                                       (onchain storage)
```

- **API Gateway** — Vercel serverless functions validate input, trigger the CRE workflow, and track status
- **CRE Workflow** — TypeScript workflow that ABI-encodes data, generates a signed report via DON consensus, and writes to the DataRegistry
- **DataRegistry** — Solidity contract implementing `IReceiver` that stores `bytes32 key → bytes value` pairs with timestamps and workflow provenance
- **Status Resolution** — The `/status` endpoint polls the blockchain directly to detect confirmed writes

## Project Structure

```
chain-now/
├── api/                    # Vercel serverless functions
│   └── v1/
│       ├── write.js        # POST /api/v1/write
│       ├── status/[id].js  # GET /api/v1/status/:txId
│       ├── read/[chain]/[key].js  # GET /api/v1/read/:chain/:key
│       ├── chains.js       # GET /api/v1/chains
│       └── webhook.js      # POST /api/v1/webhook (CRE callback)
├── lib/
│   ├── chains.js           # Chain registry (22 chains, slugs, RPCs, contract addresses)
│   └── cre-trigger.js      # ETH-signed JWT trigger for CRE gateway
├── contracts/
│   ├── src/DataRegistry.sol # IReceiver consumer contract
│   ├── script/             # Foundry deployment script
│   └── DEPLOY.md           # Deployment guide with forwarder addresses
├── cre-workflow/
│   ├── project.yaml        # CRE project config
│   └── agent-onchain-writer/
│       ├── main.ts         # CRE TypeScript workflow
│       ├── workflow.yaml   # Workflow metadata + targets
│       └── config.*.json   # Per-environment config
├── chain-now-skill/        # Agent skill (installable via npx skills)
│   ├── SKILL.md
│   └── references/
├── public/
│   └── index.html          # Landing page
├── middleware.js            # Rate limiting
└── package.json
```

## Agent Skill

Install the chain.now skill to give any AI coding assistant the knowledge to write data onchain:

```bash
npx skills add glcll/chain-now -g -y
```

Compatible with Cursor, Claude Code, Codex, Windsurf, Amp, Cline, and more.

## Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `CRE_GATEWAY_URL` | CRE gateway endpoint |
| `CRE_WORKFLOW_ID` | Deployed workflow ID (64-char hex) |
| `CRE_PRIVATE_KEY` | Private key of a wallet linked to the CRE org |
| `WEBHOOK_SECRET` | Random hex for webhook authentication |
| `REGISTRY_SEPOLIA` | Deployed DataRegistry address on Sepolia |
| `REGISTRY_BASE_SEPOLIA` | Deployed DataRegistry address on Base Sepolia |

## Development

```bash
npm install
vercel dev
```

## Deploying to Additional Chains

To add support for a new chain:

1. Deploy `DataRegistry.sol` with the chain's [KeystoneForwarder address](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts)
2. Set the `REGISTRY_<CHAIN>` env var on Vercel
3. Add the registry address to the CRE workflow's config
4. Redeploy the CRE workflow (`cre workflow deploy`)

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Chainlink or Chainlink Labs. Use at your own risk.

## License

MIT
