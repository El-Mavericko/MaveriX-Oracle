export interface FeedConfig {
  id: string;
  label: string;
  address: string;
  coinGeckoId: string;
}

export interface FeedPrice {
  price: number;
  roundId: bigint;
  updatedAt: Date;
}

export interface DeviationPoint {
  time: string;
  oraclePrice: number;
  marketPrice: number;
  deviation: number;
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
