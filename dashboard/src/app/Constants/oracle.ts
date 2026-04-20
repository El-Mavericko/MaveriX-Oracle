import type { FeedConfig } from "../types/oracle";

export const ORACLE_ABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function getRoundData(uint80 _roundId) view returns (uint80, int256, uint256, uint256, uint80)",
  "function updateAnswer(int256 _answer)",
];

// Alias used by multi-feed fetching
export const CHAINLINK_ABI = ORACLE_ABI;

interface NetworkConfig {
  label: string;
  oracleAddress: string;
  feeds: FeedConfig[];
}

export const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
  1: {
    label: "Mainnet",
    oracleAddress: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    feeds: [
      { id: "eth",  label: "ETH / USD",  address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", coinGeckoId: "ethereum",  heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
      { id: "btc",  label: "BTC / USD",  address: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", coinGeckoId: "bitcoin",   heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
      { id: "link", label: "LINK / USD", address: "0x2c1d072e956AFFC0D435Cb7AC308d97936C55D5c", coinGeckoId: "chainlink", heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
    ],
  },
  11155111: {
    label: "Sepolia",
    oracleAddress: "0x2cFeEfdF5bbDfe530b81Fbe6caf20b17f7C4D942",
    feeds: [
      { id: "eth",  label: "ETH / USD",  address: "0x694AA1769357215DE4FAC081bf1f309aDC325306", coinGeckoId: "ethereum",  heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
      { id: "btc",  label: "BTC / USD",  address: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", coinGeckoId: "bitcoin",   heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
      { id: "link", label: "LINK / USD", address: "0xc59E3633BAAC79493d908e63626716e204A45EdF", coinGeckoId: "chainlink", heartbeatSeconds: 3600,  deviationThreshold: 0.5  },
    ],
  },
};

const MAINNET_CONFIG = NETWORK_CONFIGS[1];

export function getNetworkConfig(chainId: number | null): NetworkConfig {
  if (chainId && NETWORK_CONFIGS[chainId]) return NETWORK_CONFIGS[chainId];
  return MAINNET_CONFIG;
}

// Public fallback RPCs — used when no wallet extension is detected
export const FALLBACK_RPCS: Record<number, string> = {
  1: "https://ethereum.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

// Secondary fallbacks tried if the primary RPC fails
export const FALLBACK_RPCS_ALT: Record<number, string[]> = {
  1: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
  11155111: ["https://rpc.sepolia.org"],
};

// Legacy exports — kept for components that haven't been updated yet
export const ORACLE_ADDRESS = NETWORK_CONFIGS[11155111].oracleAddress;
export const FEEDS: FeedConfig[] = NETWORK_CONFIGS[11155111].feeds;
