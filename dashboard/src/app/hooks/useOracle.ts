import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { CHAINLINK_ABI, ORACLE_ABI, getNetworkConfig } from "../Constants/oracle";
import { useWeb3 } from "../Context/Web3Provider";
import { useToast } from "../Context/ToastProvider";
import { useAlerts } from "./useAlerts";
import type { FeedPrice, DeviationPoint, EventLogEntry } from "../types/oracle";

export function useOracle() {
  const { signer, chainId } = useWeb3();
  const { addToast } = useToast();
  const { alerts, addAlert, removeAlert, checkAlerts } = useAlerts();

  const [feedPrices, setFeedPrices] = useState<Record<string, FeedPrice>>({});
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [deviationHistory, setDeviationHistory] = useState<DeviationPoint[]>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cross-interval access without stale closures
  const roundIdRef = useRef<bigint | null>(null);
  const feedPricesRef = useRef<Record<string, FeedPrice>>({});

  // Backward-compat derived values for OracleHealthPanel
  const price = feedPrices["eth"]
    ? feedPrices["eth"].price.toFixed(2)
    : "Loading...";
  const marketPrice = marketPrices["ethereum"] ?? null;

  /* -----------------------------------------
     FETCH ALL ORACLE FEEDS (read-only)
     Runs every 15s — fires all three feeds in parallel
  ----------------------------------------- */
  async function fetchOraclePrices() {
    if (!window.ethereum) return;
    const { feeds } = getNetworkConfig(chainId);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      const results = await Promise.allSettled(
        feeds.map(async feed => {
          const contract = new ethers.Contract(feed.address, CHAINLINK_ABI, provider);
          const data = await contract.latestRoundData();
          return {
            feedId: feed.id,
            price: Number(data[1]) / 1e8,
            roundId: data[0] as bigint,
            updatedAt: new Date(),
          };
        })
      );

      const newPrices: Record<string, FeedPrice> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          newPrices[result.value.feedId] = result.value;
        }
      }

      feedPricesRef.current = { ...feedPricesRef.current, ...newPrices };
      setFeedPrices(prev => ({ ...prev, ...newPrices }));

      // Detect new ETH round → append event log entry
      const ethRound = newPrices["eth"];
      if (ethRound) {
        if (roundIdRef.current !== null && ethRound.roundId !== roundIdRef.current) {
          setEventLog(prev => [
            {
              id: ethRound.roundId.toString(),
              time: new Date().toLocaleTimeString(),
              roundId: ethRound.roundId.toString(),
              price: `$${ethRound.price.toFixed(2)}`,
            },
            ...prev,
          ].slice(0, 20));
        }
        roundIdRef.current = ethRound.roundId;
        checkAlerts(ethRound.price);
      }
    } catch (err) {
      console.error("Oracle fetch error:", err);
      addToast("Oracle fetch failed — check wallet connection", "error");
    }
  }

  /* -----------------------------------------
     FETCH MARKET PRICES FROM COINGECKO
     Runs every 60s — single batched request
  ----------------------------------------- */
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

      // Log deviation point for ETH
      const ethOracle = feedPricesRef.current["eth"];
      const ethMarket = prices["ethereum"];
      if (ethOracle && ethMarket) {
        const deviation = ((ethOracle.price - ethMarket) / ethMarket) * 100;
        setDeviationHistory(prev =>
          [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              oraclePrice: parseFloat(ethOracle.price.toFixed(2)),
              marketPrice: parseFloat(ethMarket.toFixed(2)),
              deviation: parseFloat(deviation.toFixed(4)),
            },
          ].slice(-50)
        );
      }
    } catch (err) {
      console.error("Market fetch error:", err);
      addToast("Market data unavailable", "info");
    }
  }

  /* -----------------------------------------
     UPDATE ORACLE PRICE (write — requires signer)
  ----------------------------------------- */
  async function updatePrice(newPrice: number) {
    if (!signer) return;
    const { oracleAddress } = getNetworkConfig(chainId);
    try {
      setLoading(true);
      const contract = new ethers.Contract(oracleAddress, ORACLE_ABI, signer);
      const tx = await contract.updateAnswer(ethers.parseUnits(newPrice.toString(), 8));
      await tx.wait();
      addToast(`Oracle updated to $${newPrice.toFixed(2)}`, "success");
      fetchOraclePrices();
    } catch (err) {
      console.error("Update error:", err);
      addToast("Oracle update failed", "error");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  /* -----------------------------------------
     POLLING
     Reset state on network switch, then re-poll
  ----------------------------------------- */
  useEffect(() => {
    // Clear stale feed data when switching networks
    setFeedPrices({});
    setMarketPrices({});
    feedPricesRef.current = {};
    roundIdRef.current = null;

    fetchOraclePrices();
    fetchMarketPrices();

    const oracleInterval = setInterval(fetchOraclePrices, 15_000);
    const marketInterval = setInterval(fetchMarketPrices, 60_000);

    return () => {
      clearInterval(oracleInterval);
      clearInterval(marketInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return {
    // Multi-feed
    feedPrices,
    marketPrices,
    deviationHistory,
    eventLog,
    // Backward compat for OracleHealthPanel
    price,
    marketPrice,
    lastUpdated,
    updatePrice,
    loading,
    // Alerts
    alerts,
    addAlert,
    removeAlert,
    // Active network config (for passing to sub-components)
    networkConfig: getNetworkConfig(chainId),
  };
}
