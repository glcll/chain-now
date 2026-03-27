const CHAINS = {
  "ethereum": {
    selectorName: "ethereum-mainnet",
    chainId: 1,
    name: "Ethereum",
    explorer: "https://etherscan.io",
    rpcUrl: process.env.RPC_ETHEREUM || "https://ethereum-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_ETHEREUM || "",
    testnet: false,
  },
  "arbitrum": {
    selectorName: "arbitrum-mainnet",
    chainId: 42161,
    name: "Arbitrum One",
    explorer: "https://arbiscan.io",
    rpcUrl: process.env.RPC_ARBITRUM || "https://arbitrum-one-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_ARBITRUM || "",
    testnet: false,
  },
  "base": {
    selectorName: "base-mainnet",
    chainId: 8453,
    name: "Base",
    explorer: "https://basescan.org",
    rpcUrl: process.env.RPC_BASE || "https://base-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_BASE || "",
    testnet: false,
  },
  "optimism": {
    selectorName: "optimism-mainnet",
    chainId: 10,
    name: "OP Mainnet",
    explorer: "https://optimistic.etherscan.io",
    rpcUrl: process.env.RPC_OPTIMISM || "https://optimism-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_OPTIMISM || "",
    testnet: false,
  },
  "polygon": {
    selectorName: "polygon-mainnet",
    chainId: 137,
    name: "Polygon",
    explorer: "https://polygonscan.com",
    rpcUrl: process.env.RPC_POLYGON || "https://polygon-bor-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_POLYGON || "",
    testnet: false,
  },
  "avalanche": {
    selectorName: "avalanche-mainnet",
    chainId: 43114,
    name: "Avalanche",
    explorer: "https://snowtrace.io",
    rpcUrl: process.env.RPC_AVALANCHE || "https://avalanche-c-chain-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_AVALANCHE || "",
    testnet: false,
  },
  "bnb": {
    selectorName: "bnb-chain-mainnet",
    chainId: 56,
    name: "BNB Chain",
    explorer: "https://bscscan.com",
    rpcUrl: process.env.RPC_BNB || "https://bsc-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_BNB || "",
    testnet: false,
  },
  "scroll": {
    selectorName: "scroll-mainnet",
    chainId: 534352,
    name: "Scroll",
    explorer: "https://scrollscan.com",
    rpcUrl: process.env.RPC_SCROLL || "https://scroll-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_SCROLL || "",
    testnet: false,
  },
  "linea": {
    selectorName: "linea-mainnet",
    chainId: 59144,
    name: "Linea",
    explorer: "https://lineascan.build",
    rpcUrl: process.env.RPC_LINEA || "https://linea-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_LINEA || "",
    testnet: false,
  },
  "sonic": {
    selectorName: "sonic-mainnet",
    chainId: 146,
    name: "Sonic",
    explorer: "https://sonicscan.org",
    rpcUrl: process.env.RPC_SONIC || "",
    registryAddress: process.env.REGISTRY_SONIC || "",
    testnet: false,
  },
  "world-chain": {
    selectorName: "world-chain-mainnet",
    chainId: 480,
    name: "World Chain",
    explorer: "https://worldscan.org",
    rpcUrl: process.env.RPC_WORLD_CHAIN || "",
    registryAddress: process.env.REGISTRY_WORLD_CHAIN || "",
    testnet: false,
  },
  "zksync": {
    selectorName: "zksync-era-mainnet",
    chainId: 324,
    name: "zkSync Era",
    explorer: "https://explorer.zksync.io",
    rpcUrl: process.env.RPC_ZKSYNC || "",
    registryAddress: process.env.REGISTRY_ZKSYNC || "",
    testnet: false,
  },
  "celo": {
    selectorName: "celo-mainnet",
    chainId: 42220,
    name: "Celo",
    explorer: "https://celoscan.io",
    rpcUrl: process.env.RPC_CELO || "https://celo-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_CELO || "",
    testnet: false,
  },
  "gnosis": {
    selectorName: "gnosis-mainnet",
    chainId: 100,
    name: "Gnosis Chain",
    explorer: "https://gnosisscan.io",
    rpcUrl: process.env.RPC_GNOSIS || "https://gnosis-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_GNOSIS || "",
    testnet: false,
  },
  "mantle": {
    selectorName: "mantle-mainnet",
    chainId: 5000,
    name: "Mantle",
    explorer: "https://mantlescan.xyz",
    rpcUrl: process.env.RPC_MANTLE || "",
    registryAddress: process.env.REGISTRY_MANTLE || "",
    testnet: false,
  },
  "ink": {
    selectorName: "ink-mainnet",
    chainId: 57073,
    name: "Ink",
    explorer: "https://explorer.inkonchain.com",
    rpcUrl: process.env.RPC_INK || "",
    registryAddress: process.env.REGISTRY_INK || "",
    testnet: false,
  },
  "ethereum-sepolia": {
    selectorName: "ethereum-testnet-sepolia",
    chainId: 11155111,
    name: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    rpcUrl: process.env.RPC_SEPOLIA || "https://ethereum-sepolia-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_SEPOLIA || "",
    testnet: true,
  },
  "arbitrum-sepolia": {
    selectorName: "arbitrum-testnet-sepolia",
    chainId: 421614,
    name: "Arbitrum Sepolia",
    explorer: "https://sepolia.arbiscan.io",
    rpcUrl: process.env.RPC_ARB_SEPOLIA || "https://arbitrum-sepolia-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_ARB_SEPOLIA || "",
    testnet: true,
  },
  "base-sepolia": {
    selectorName: "base-testnet-sepolia",
    chainId: 84532,
    name: "Base Sepolia",
    explorer: "https://sepolia.basescan.org",
    rpcUrl: process.env.RPC_BASE_SEPOLIA || "https://base-sepolia-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_BASE_SEPOLIA || "",
    testnet: true,
  },
  "optimism-sepolia": {
    selectorName: "optimism-testnet-sepolia",
    chainId: 11155420,
    name: "OP Sepolia",
    explorer: "https://sepolia-optimism.etherscan.io",
    rpcUrl: process.env.RPC_OP_SEPOLIA || "https://optimism-sepolia-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_OP_SEPOLIA || "",
    testnet: true,
  },
  "polygon-amoy": {
    selectorName: "polygon-testnet-amoy",
    chainId: 80002,
    name: "Polygon Amoy",
    explorer: "https://amoy.polygonscan.com",
    rpcUrl: process.env.RPC_AMOY || "https://polygon-amoy-bor-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_AMOY || "",
    testnet: true,
  },
  "avalanche-fuji": {
    selectorName: "avalanche-testnet-fuji",
    chainId: 43113,
    name: "Avalanche Fuji",
    explorer: "https://testnet.snowtrace.io",
    rpcUrl: process.env.RPC_FUJI || "https://avalanche-fuji-c-chain-rpc.publicnode.com",
    registryAddress: process.env.REGISTRY_FUJI || "",
    testnet: true,
  },
};

export function getChain(name) {
  return CHAINS[name] || null;
}

export function getChainBySelector(selectorName) {
  return Object.values(CHAINS).find(c => c.selectorName === selectorName) || null;
}

export function listChains({ testnets = true } = {}) {
  return Object.entries(CHAINS)
    .filter(([, c]) => testnets || !c.testnet)
    .map(([slug, c]) => ({
      slug,
      name: c.name,
      chainId: c.chainId,
      explorer: c.explorer,
      testnet: c.testnet,
      available: !!c.registryAddress,
    }));
}

export function explorerTxUrl(chainSlug, txHash) {
  const chain = CHAINS[chainSlug];
  if (!chain) return null;
  return `${chain.explorer}/tx/${txHash}`;
}

export { CHAINS };
