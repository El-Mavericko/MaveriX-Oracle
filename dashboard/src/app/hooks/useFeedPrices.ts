import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import {
  CHAINLINK_ABI, FALLBACK_RPCS, getNetworkConfig,
  ORACLE_POLL_INTERVAL_MS, EVENT_LOG_MAX_ENTRIES,
  CHAIN_MAINNET,
} from "@/src/app/constants";
import { useToast } from "@/src/app/context";
import type { FeedPrice, EventLogEntry, UpdateTrigger } from "@/src/app/types";

export function useFeedPrices(
  chainId: number | null,
  checkAlerts: (price: number) => void,
) {
  const { addToast } = useToast();

  const [feedPrices, setFeedPrices]   = useState<Record<string, FeedPrice>>({});
  const [eventLog,   setEventLog]     = useState<EventLogEntry[]>([]);

  // Exposed via ref so useMarketPrices can read the latest value without stale closures
  const feedPricesRef = useRef<Record<string, FeedPrice>>({});
  const roundIdRef    = useRef<bigint | null>(null);

  function getProvider(chainKey: number): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(
      FALLBACK_RPCS[chainKey] ?? FALLBACK_RPCS[CHAIN_MAINNET]
    );
  }

  async function fetchFeedPrices() {
    const { feeds } = getNetworkConfig(chainId);
    try {
      const isSupportedNetwork = chainId && FALLBACK_RPCS[chainId];
      const provider = window.ethereum && isSupportedNetwork
        ? new ethers.BrowserProvider(window.ethereum)
        : getProvider(chainId ?? CHAIN_MAINNET);

      const results: PromiseSettledResult<{
        feedId: string; price: number; roundId: bigint;
        updatedAt: Date; secondsSinceUpdate: number; trigger: UpdateTrigger;
      }>[] = [];

      for (const feed of feeds) {
        const fetchOne = async () => {
          const contract = new ethers.Contract(feed.address, CHAINLINK_ABI, provider);
          const data = await contract.latestRoundData();
          const updatedAt = new Date(Number(data[3]) * 1000);
          const secondsSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
          const trigger: UpdateTrigger =
            secondsSinceUpdate >= feed.heartbeatSeconds * 0.95 ? "heartbeat" :
            secondsSinceUpdate < feed.heartbeatSeconds * 0.5   ? "deviation" :
            "unknown";
          return { feedId: feed.id, price: Number(data[1]) / 1e8, roundId: data[0] as bigint, updatedAt, secondsSinceUpdate, trigger };
        };
        const result = await fetchOne()
          .catch(async () => {
            await new Promise(r => setTimeout(r, 1000)); // retry after 1s
            return fetchOne();
          })
          .then(v => ({ status: "fulfilled" as const, value: v }))
          .catch(() => ({ status: "rejected" as const, reason: null }));
        results.push(result);
        await new Promise(r => setTimeout(r, 500)); // 500ms between feeds
      }

      const newPrices: Record<string, FeedPrice> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          newPrices[result.value.feedId] = result.value;
        }
      }

      feedPricesRef.current = { ...feedPricesRef.current, ...newPrices };
      setFeedPrices(prev => ({ ...prev, ...newPrices }));

      const ethRound = newPrices["eth"];
      if (ethRound) {
        if (roundIdRef.current !== null && ethRound.roundId !== roundIdRef.current) {
          setEventLog(prev => [
            {
              id:      ethRound.roundId.toString(),
              time:    new Date().toLocaleTimeString(),
              roundId: ethRound.roundId.toString(),
              price:   `$${ethRound.price.toFixed(2)}`,
            },
            ...prev,
          ].slice(0, EVENT_LOG_MAX_ENTRIES));
        }
        roundIdRef.current = ethRound.roundId;
        checkAlerts(ethRound.price);
      }
    } catch (err) {
      console.error("Oracle fetch error:", err);
      addToast("Oracle fetch failed", "error");
    }
  }

  useEffect(() => {
    setFeedPrices({});
    feedPricesRef.current = {};
    roundIdRef.current = null;

    fetchFeedPrices();
    const interval = setInterval(fetchFeedPrices, ORACLE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return { feedPrices, feedPricesRef, eventLog };
}
