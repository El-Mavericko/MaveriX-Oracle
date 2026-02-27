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
      { id: "eth", label: "ETH / USD", address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", coinGeckoId: "ethereum" },
      { id: "btc", label: "BTC / USD", address: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", coinGeckoId: "bitcoin" },
      { id: "link", label: "LINK / USD", address: "0x2c1d072e956AFFC0D435Cb7AC308d97936C55D5c", coinGeckoId: "chainlink" },
    ],
  },
  11155111: {
    label: "Sepolia",
    oracleAddress: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    feeds: [
      { id: "eth", label: "ETH / USD", address: "0x694AA1769357215DE4FAC081bf1f309aDC325306", coinGeckoId: "ethereum" },
      { id: "btc", label: "BTC / USD", address: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", coinGeckoId: "bitcoin" },
      { id: "link", label: "LINK / USD", address: "0xc59E3633BAAC79493d908e63626716e204A45EdF", coinGeckoId: "chainlink" },
    ],
  },
};

const SEPOLIA_CONFIG = NETWORK_CONFIGS[11155111];

export function getNetworkConfig(chainId: number | null): NetworkConfig {
  if (chainId && NETWORK_CONFIGS[chainId]) return NETWORK_CONFIGS[chainId];
  return SEPOLIA_CONFIG;
}

// Legacy exports — kept for components that haven't been updated yet
export const ORACLE_ADDRESS = SEPOLIA_CONFIG.oracleAddress;
export const FEEDS: FeedConfig[] = SEPOLIA_CONFIG.feeds;
