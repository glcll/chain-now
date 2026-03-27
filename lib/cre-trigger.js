import { createHash, randomUUID } from "crypto";
import {
  createWalletClient,
  http,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const CRE_GATEWAY_URL = process.env.CRE_GATEWAY_URL || "https://01.gateway.zone-a.cre.chain.link";
const CRE_WORKFLOW_ID = process.env.CRE_WORKFLOW_ID;
const CRE_PRIVATE_KEY = process.env.CRE_PRIVATE_KEY;

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
  }
  return obj;
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function triggerWorkflow(payload) {
  if (!CRE_WORKFLOW_ID || !CRE_PRIVATE_KEY
    || CRE_WORKFLOW_ID.startsWith("PLACEHOLDER")
    || CRE_PRIVATE_KEY.startsWith("PLACEHOLDER")) {
    throw new Error(
      "CRE workflow not deployed yet. Set CRE_WORKFLOW_ID and CRE_PRIVATE_KEY after deploying the workflow."
    );
  }

  const privKey = CRE_PRIVATE_KEY.startsWith("0x") ? CRE_PRIVATE_KEY : `0x${CRE_PRIVATE_KEY}`;
  const account = privateKeyToAccount(privKey);

  const requestBody = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "workflows.execute",
    params: {
      input: payload,
      workflow: {
        workflowID: CRE_WORKFLOW_ID,
      },
    },
  };

  const sortedBody = JSON.stringify(sortObjectKeys(requestBody));
  const digestHash = createHash("sha256").update(sortedBody).digest("hex");
  const digest = `0x${digestHash}`;

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: "ETH", typ: "JWT" };
  const jwtPayload = {
    digest,
    iss: account.address,
    iat: now,
    exp: now + 300,
    jti: randomUUID(),
  };

  const headerB64 = base64url(JSON.stringify(jwtHeader));
  const payloadB64 = base64url(JSON.stringify(jwtPayload));
  const message = `${headerB64}.${payloadB64}`;

  const signature = await account.signMessage({ message });

  const sigBytes = Buffer.from(signature.slice(2), "hex");
  const signatureB64 = base64url(sigBytes);

  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

  const response = await fetch(CRE_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: sortedBody,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`CRE gateway error ${response.status}: ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }

  if (result.error) {
    throw new Error(`CRE gateway RPC error: ${result.error.message}`);
  }

  return result;
}
