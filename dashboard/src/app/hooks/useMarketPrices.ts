import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { getNetworkConfig, MARKET_POLL_INTERVAL_MS, DEVIATION_HISTORY_MAX } from "@/src/app/constants";
import { useToast } from "@/src/app/context";
import type { FeedPrice, DeviationPoint } from "@/src/app/types";

export function useMarketPrices(
  chainId: number | null,
  feedPricesRef: MutableRefObject<Record<string, FeedPrice>>
) {
  const { addToast } = useToast();

  const [marketPrices,     setMarketPrices]     = useState<Record<string, number>>({});
  const [deviationHistory, setDeviationHistory] = useState<DeviationPoint[]>([]);
  const [lastUpdated,      setLastUpdated]      = useState<Date | null>(null);

  async function fetchMarketPrices() {
    const { feeds } = getNetworkConfig(chainId);
    try {
      const ids = feeds.map(f => f.coinGeckoId).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const prices: Record<string, number> = {};
      for (const feed of feeds) {
        if (data[feed.coinGeckoId]?.usd) {
          prices[feed.coinGeckoId] = data[feed.coinGeckoId].usd;
        }
      }
      setMarketPrices(prices);
      setLastUpdated(new Date());

      const ethOracle = feedPricesRef.current["eth"];
      const ethMarket = prices["ethereum"];
      if (ethOracle && ethMarket) {
        const deviation = ((ethOracle.price - ethMarket) / ethMarket) * 100;
        setDeviationHistory(prev =>
          [
            ...prev,
            {
              time:        new Date().toLocaleTimeString(),
              oraclePrice: parseFloat(ethOracle.price.toFixed(2)),
              marketPrice: parseFloat(ethMarket.toFixed(2)),
              deviation:   parseFloat(deviation.toFixed(4)),
            },
          ].slice(-DEVIATION_HISTORY_MAX)
        );
      }
    } catch (err) {
      console.error("Market fetch error:", err);
      addToast("Market data unavailable", "info");
    }
  }

  useEffect(() => {
    setMarketPrices({});
    setDeviationHistory([]);

    fetchMarketPrices();
    const interval = setInterval(fetchMarketPrices, MARKET_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return { marketPrices, deviationHistory, lastUpdated };
}
