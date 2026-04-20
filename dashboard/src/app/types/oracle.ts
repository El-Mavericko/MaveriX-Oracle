export interface FeedConfig {
  id: string;
  label: string;
  address: string;
  coinGeckoId: string;
  heartbeatSeconds: number;   // max time between updates regardless of price move
  deviationThreshold: number; // % price move that triggers an early update
}

export type UpdateTrigger = "heartbeat" | "deviation" | "unknown";

export interface FeedPrice {
  price: number;
  roundId: bigint;
  updatedAt: Date;
  secondsSinceUpdate: number;
  trigger: UpdateTrigger;
}

export interface DeviationPoint {
  time: string;
  oraclePrice: number;
  marketPrice: number;
  deviation: number;       // ETH oracle vs market %
  btcDeviation?: number;   // BTC oracle vs market %
}

export interface PriceAlert {
  id: string;
  threshold: number;
  direction: "above" | "below";
  triggered: boolean;
  createdAt: number;
}

export interface EventLogEntry {
  id: string;
  time: string;
  roundId: string;
  price: string;
}

export type OracleSource = "chainlink" | "pyth" | "twap";

export interface OraclePricePoint {
  source: OracleSource;
  price: number;
  confidence?: number; // Pyth confidence interval
}

export interface OracleComparisonSnapshot {
  feedId: string;
  label: string;
  time: string;
  prices: Partial<Record<OracleSource, number>>;
  median: number;
  scores: Partial<Record<OracleSource, number>>; // % deviation from median
}
