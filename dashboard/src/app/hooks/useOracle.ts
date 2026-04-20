import { useEffect } from "react";
import { getNetworkConfig } from "@/src/app/constants";
import { useWeb3 } from "@/src/app/context";
import { useAlerts } from "./useAlerts";
import { useFeedPrices } from "./useFeedPrices";
import { useMarketPrices } from "./useMarketPrices";
import { useOracleWriter } from "./useOracleWriter";
import { useFeedDeviationAlerts } from "./useFeedDeviationAlerts";
import { useOracleComparison } from "./useOracleComparison";
import { useAavePositions } from "./useAavePositions";

export function useOracle() {
  const { chainId, address } = useWeb3();
  const { alerts, addAlert, removeAlert, checkAlerts } = useAlerts();
  const {
    alerts: deviationAlerts,
    addDeviationAlert,
    removeDeviationAlert,
    resetDeviationAlert,
    checkDeviationAlerts,
  } = useFeedDeviationAlerts();

  const { feedPrices, feedPricesRef, eventLog } = useFeedPrices(chainId, checkAlerts);
  const { marketPrices, deviationHistory, lastUpdated } = useMarketPrices(chainId, feedPricesRef);
  const { updatePrice, loading } = useOracleWriter();

  const networkConfig = getNetworkConfig(chainId);
  const feedLabelMap  = Object.fromEntries(networkConfig.feeds.map(f => [f.id, f.label]));
  const feedIds       = networkConfig.feeds.map(f => f.id);

  const { snapshots: comparisonSnapshots, history: comparisonHistory } =
    useOracleComparison(feedPrices, feedIds, feedLabelMap);

  const { position: aavePosition, loading: aaveLoading } =
    useAavePositions(address, chainId);

  // Check deviation alerts whenever prices update
  useEffect(() => {
    if (Object.keys(feedPrices).length && Object.keys(marketPrices).length) {
      checkDeviationAlerts(feedPrices, marketPrices, feedLabelMap);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPrices, marketPrices]);

  const price       = feedPrices["eth"] ? feedPrices["eth"].price.toFixed(2) : "Loading...";
  const marketPrice = marketPrices["ethereum"] ?? null;

  return {
    feedPrices,
    marketPrices,
    deviationHistory,
    eventLog,
    price,
    marketPrice,
    lastUpdated,
    updatePrice,
    loading,
    alerts,
    addAlert,
    removeAlert,
    deviationAlerts,
    addDeviationAlert,
    removeDeviationAlert,
    resetDeviationAlert,
    comparisonSnapshots,
    comparisonHistory,
    aavePosition,
    aaveLoading,
    networkConfig,
  };
}
