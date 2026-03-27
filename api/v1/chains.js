import { listChains } from "../../lib/chains.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const includeTestnets = req.query.testnets !== "false";

  const chains = listChains({ testnets: includeTestnets });

  return res.status(200).json({
    chains,
    total: chains.length,
    available: chains.filter((c) => c.available).length,
  });
}
