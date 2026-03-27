# Deploying DataRegistry

Two deployment phases: **simulation** (local testing with `cre workflow simulate --broadcast`) and **production** (deployed CRE workflow). Each uses a different forwarder contract.

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A funded wallet on your target chain(s)
- Your deployer private key (without `0x` prefix for CRE, with `0x` for Foundry)

## Quick Start — Ethereum Sepolia (Simulation)

```bash
cd contracts

# Install OpenZeppelin (needed for Ownable, IERC165)
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Deploy with the Mock Forwarder for simulation testing
FORWARDER_ADDRESS=0x15fC6ae953E024d975e77382eEeC56A9101f9F88 \
forge script script/DeployDataRegistry.s.sol:DeployDataRegistry \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

Save the deployed address — you'll need it for the CRE workflow config and the API environment variables.

## Upgrading to Production

Once you've tested with simulation, deploy a fresh instance using the production `KeystoneForwarder`, or update the existing contract:

**Option A — Deploy new instance with production forwarder:**

```bash
FORWARDER_ADDRESS=0xF8344CFd5c43616a4366C34E3EEE75af79a74482 \
forge script script/DeployDataRegistry.s.sol:DeployDataRegistry \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

**Option B — Update existing contract's forwarder (owner only):**

```bash
cast send $REGISTRY_ADDRESS \
  "setForwarderAddress(address)" \
  0xF8344CFd5c43616a4366C34E3EEE75af79a74482 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Alternative: Deploy via Remix

If you prefer a browser-based approach:

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create `DataRegistry.sol` and paste the contract code
3. In the compiler tab, set Solidity version to `0.8.26`
4. In the deploy tab, connect MetaMask to your target chain
5. Under "Deploy", enter the forwarder address for your chain (from tables below)
6. Click Deploy and confirm the transaction
7. Copy the deployed contract address

## Forwarder Address Reference

### Simulation (MockKeystoneForwarder)

Use these when testing with `cre workflow simulate --broadcast`.

| Chain | Mock Forwarder Address |
|-------|----------------------|
| **Ethereum Sepolia** | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` |
| **Arbitrum Sepolia** | `0xd41263567ddfead91504199b8c6c87371e83ca5d` |
| **Base Sepolia** | `0x82300bd7c3958625581cc2f77bc6464dcecdf3e5` |
| **OP Sepolia** | `0xa2888380dff3704a8ab6d1cd1a8f69c15fea5ee3` |
| **Polygon Amoy** | `0x3675a5eb2286a3f87e8278fc66edf458a2e3bb74` |
| **Avalanche Fuji** | `0x2e7371a5d032489e4f60216d8d898a4c10805963` |
| **BSC Testnet** | `0xa238e42cb8782808dbb2f37e19859244ec4779b0` |

### Production (KeystoneForwarder)

Use these for deployed CRE workflows.

**Testnets:**

| Chain | Forwarder Address |
|-------|------------------|
| **Ethereum Sepolia** | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| **Arbitrum Sepolia** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Base Sepolia** | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| **OP Sepolia** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Polygon Amoy** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Avalanche Fuji** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |

**Mainnets:**

| Chain | Forwarder Address |
|-------|------------------|
| **Ethereum** | `0x0b93082D9b3C7C97fAcd250082899BAcf3af3885` |
| **Arbitrum One** | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| **Base** | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| **OP Mainnet** | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| **Polygon** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Avalanche** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **BNB Chain** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Scroll** | `0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1` |
| **Linea** | `0x9eF6468C5f37b976E57d52054c693269479A784d` |
| **Sonic** | `0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1` |
| **zkSync Era** | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **World Chain** | `0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1` |

Full list: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts

## Deploying to Multiple Chains

To deploy DataRegistry across all your target testnets at once:

```bash
cd contracts

# Array of: "chain_name rpc_url forwarder_address"
TARGETS=(
  "sepolia https://ethereum-sepolia-rpc.publicnode.com 0x15fC6ae953E024d975e77382eEeC56A9101f9F88"
  "arb-sepolia https://arbitrum-sepolia-rpc.publicnode.com 0xd41263567ddfead91504199b8c6c87371e83ca5d"
  "base-sepolia https://base-sepolia-rpc.publicnode.com 0x82300bd7c3958625581cc2f77bc6464dcecdf3e5"
)

for target in "${TARGETS[@]}"; do
  read -r name rpc forwarder <<< "$target"
  echo "Deploying to $name..."
  FORWARDER_ADDRESS=$forwarder \
  forge script script/DeployDataRegistry.s.sol:DeployDataRegistry \
    --rpc-url "$rpc" \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast
  echo "---"
done
```

## After Deployment

1. **Record each contract address** per chain
2. **Update your `.env`** file with the addresses:
   ```
   REGISTRY_SEPOLIA=0xYourDeployedAddress
   REGISTRY_ARB_SEPOLIA=0xYourDeployedAddress
   REGISTRY_BASE_SEPOLIA=0xYourDeployedAddress
   ```
3. **Update the CRE workflow config** (`cre-workflow/config.staging.json`) with the matching addresses in `registryAddresses`
4. **Verify the contract** on the block explorer (optional but recommended):
   ```bash
   forge verify-contract $REGISTRY_ADDRESS \
     DataRegistry \
     --constructor-args $(cast abi-encode "constructor(address)" $FORWARDER_ADDRESS) \
     --chain sepolia \
     --etherscan-api-key $ETHERSCAN_API_KEY
   ```
