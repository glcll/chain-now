/**
 * CRE HTTP Trigger helper.
 * Generates a JWT-signed request to trigger a deployed CRE workflow
 * via the Chainlink gateway.
 */

const { SignJWT, importPKCS8 } = require("jose");

const CRE_GATEWAY_URL = process.env.CRE_GATEWAY_URL;
const CRE_WORKFLOW_ID = process.env.CRE_WORKFLOW_ID;
const CRE_PRIVATE_KEY = process.env.CRE_PRIVATE_KEY;

/**
 * Trigger the CRE workflow with a JSON payload.
 * Uses JWT-signed HTTP POST per the CRE HTTP trigger spec.
 */
async function triggerWorkflow(payload) {
  if (!CRE_GATEWAY_URL || !CRE_WORKFLOW_ID || !CRE_PRIVATE_KEY
    || CRE_WORKFLOW_ID.startsWith("PLACEHOLDER")
    || CRE_PRIVATE_KEY.startsWith("PLACEHOLDER")) {
    throw new Error(
      "CRE workflow not deployed yet. Set CRE_GATEWAY_URL, CRE_WORKFLOW_ID, and CRE_PRIVATE_KEY after deploying the workflow."
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    workflow_id: CRE_WORKFLOW_ID,
    payload: JSON.stringify(payload),
    iat: now,
    exp: now + 300,
  })
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(await importPKCS8(CRE_PRIVATE_KEY, "ES256"));

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "trigger",
    params: {
      workflow_id: CRE_WORKFLOW_ID,
      payload: JSON.stringify(payload),
    },
  });

  const response = await fetch(CRE_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CRE gateway error ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = { triggerWorkflow };
