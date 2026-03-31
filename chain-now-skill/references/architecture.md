# Chain Now Architecture — Building a CRE-Backed Web Integration

This reference covers how Chain Now was built, the lessons learned, and how to replicate the pattern for your own CRE-powered applications.

> **Note:** Chain Now is currently live on **8 testnets**. The architecture is chain-agnostic and designed for 22+ EVM chains — additional deployments are coming soon.

## System Components

### 1. DataRegistry Consumer Contract (Solidity)

The on-chain storage target. Implements `IReceiver` from CRE's interface:

```solidity
contract DataRegistry is IReceiver, Ownable {
    struct Entry {
        bytes value;
        uint256 timestamp;
        bytes32 workflowId;
        bool exists;
    }

    mapping(bytes32 => Entry) private s_entries;
    address private s_forwarderAddress;

    function onReport(bytes calldata report, bytes calldata metadata) external {
        require(msg.sender == s_forwarderAddress, "Unauthorized forwarder");
        (bytes32 key, bytes memory value) = abi.decode(report, (bytes32, bytes));
        // Store entry with timestamp and workflowId from metadata
    }
}
```

**Key decisions:**
- The contract must validate `msg.sender == s_forwarderAddress` (the `KeystoneForwarder`)
- Deploy with the **simulation** forwarder (`MockKeystoneForwarder`) for testing, then switch to **production** forwarder after deploying the CRE workflow
- Forwarder addresses per chain: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts

**Gotcha:** If you deploy with the simulation forwarder and forget to update to production, writes will be silently rejected on-chain. The CRE gateway still accepts the trigger — you won't get an error, just no data on-chain.

### 2. CRE TypeScript Workflow

HTTP-triggered workflow that receives JSON, ABI-encodes it, and writes on-chain:

```typescript
import { HTTPCapability, EVMClient, getNetwork, handler, Runner } from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters, stringToHex, toHex } from "viem"

const onHttpTrigger = (runtime, payload) => {
  const request = JSON.parse(new TextDecoder().decode(payload.input))
  const evmClient = new EVMClient(getNetwork({ chainFamily: "evm", chainSelectorName: request.chain }).chainSelector.selector)
  
  const reportData = encodeAbiParameters(
    parseAbiParameters("bytes32 key, bytes value"),
    [stringToHex(request.key, { size: 32 }), toHex(new TextEncoder().encode(request.value))]
  )

  const report = runtime.report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  }).result()

  return evmClient.writeReport(runtime, {
    receiver: registryAddress,
    report,
    gasConfig: { gasLimit: "500000" },
  }).result()
}
```

**Project structure:**
```
project-root/
  project.yaml          # RPC configs, requires ethereum-mainnet for registry
  workflow-name/
    main.ts
    workflow.yaml        # Name, targets, config file references
    config.staging.json  # registryAddresses, evms, authorizedEVMAddress
    .env                 # CRE_ETH_PRIVATE_KEY (linked wallet)
```

### 3. CRE HTTP Trigger (ETH-Signed JWT)

Triggering a deployed CRE workflow requires a non-standard JWT signed with an Ethereum private key. This is the most error-prone part of integration.

**Correct implementation (Node.js/viem):**

```javascript
import { createHash, randomUUID } from "crypto";
import { privateKeyToAccount } from "viem/accounts";

async function triggerWorkflow(workflowId, privateKey, payload) {
  const account = privateKeyToAccount(privateKey);
  
  const requestBody = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "workflows.execute",
    params: {
      input: payload,
      workflow: { workflowID: workflowId },
    },
  };

  // Sort keys recursively before hashing
  const sortedBody = JSON.stringify(sortObjectKeys(requestBody));
  const digest = `0x${createHash("sha256").update(sortedBody).digest("hex")}`;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ETH", typ: "JWT" }));
  const payload64 = base64url(JSON.stringify({
    digest,
    iss: account.address,
    iat: now,
    exp: now + 300,
    jti: randomUUID(),
  }));

  // Sign with Ethereum message prefix (NOT raw ECDSA)
  const signature = await account.signMessage({ message: `${header}.${payload64}` });
  const jwt = `${header}.${payload64}.${base64url(Buffer.from(signature.slice(2), "hex"))}`;

  const response = await fetch("https://01.gateway.zone-a.cre.chain.link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: sortedBody,
  });
  
  return response.json();
}
```

**Critical details:**
- Algorithm is `"ETH"`, not `"ES256"` — this is Ethereum ECDSA with message prefix, not standard JWT
- The `digest` field is SHA256 of the **sorted** JSON body (keys sorted recursively)
- The private key must belong to a wallet **linked to the CRE organization**
- `signMessage` from `viem` applies the `\x19Ethereum Signed Message:\n` prefix automatically
- Gateway URL: `https://01.gateway.zone-a.cre.chain.link`

### 4. API Gateway (Vercel Serverless Functions)

**Environment variables needed:**

```
CRE_GATEWAY_URL=https://01.gateway.zone-a.cre.chain.link
CRE_WORKFLOW_ID=<64-char hex from cre workflow deploy>
CRE_PRIVATE_KEY=0x<linked wallet private key>
WEBHOOK_SECRET=<random hex>
REGISTRY_SEPOLIA=0x<deployed DataRegistry address>
KV_REST_API_URL=<Upstash Redis URL>
KV_REST_API_TOKEN=<Upstash Redis token>
```

## Common Pitfalls

### 1. Serverless fire-and-forget doesn't work
Vercel/AWS Lambda terminate after sending the HTTP response. If you trigger the CRE workflow with a non-awaited promise, it will never execute. **Always `await` the trigger call.**

### 2. Address checksum validation
`viem` strictly validates EIP-55 checksums. Registry addresses from environment variables may not be checksummed. Always wrap with `getAddress()`:
```javascript
import { getAddress } from "viem";
const checksumAddr = getAddress(process.env.REGISTRY_SEPOLIA);
```

### 3. No execution status API from CRE
After triggering a workflow, the gateway returns `"status": "ACCEPTED"` with a `workflow_execution_id`. There is currently no API to query that execution's result. Build your own status resolution — Chain Now polls the on-chain contract directly.

### 4. Mainnet RPC required for testnet deploys
`cre workflow deploy` requires an Ethereum mainnet RPC in `project.yaml` even for testnet-only workflows, because the Workflow Registry contract lives on mainnet.

### 5. Linked wallet limit
CRE organizations have a limit on linked wallet owners (currently 2). The `cre account link-key` error message is a raw GraphQL error. Plan wallet management ahead of time.

### 6. ESM compatibility
If using `jose` v6+ or other ESM-only packages in Vercel, add `"type": "module"` to `package.json` and convert all files to `import`/`export` syntax.

## CRE CLI Cheat Sheet

```bash
cre login                                    # Authenticate
cre whoami                                   # Check auth status
cre init --template hello-world-ts           # Scaffold TS project
cre workflow simulate <workflow-path>        # Test locally
cre workflow deploy <workflow-path> --target staging  # Deploy
cre account link-key --owner-label "name" --yes      # Link wallet
cre account list-linked-keys                 # List linked wallets
```
