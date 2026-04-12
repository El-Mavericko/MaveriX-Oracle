import { getNetworkConfig } from "@/src/app/constants";
import { useWeb3 } from "@/src/app/context";
import { useAlerts } from "./useAlerts";
import { useFeedPrices } from "./useFeedPrices";
import { useMarketPrices } from "./useMarketPrices";
import { useOracleWriter } from "./useOracleWriter";

export function useOracle() {
  const { chainId } = useWeb3();
  const { alerts, addAlert, removeAlert, checkAlerts } = useAlerts();

  const { feedPrices, feedPricesRef, eventLog } = useFeedPrices(chainId, checkAlerts);
  const { marketPrices, deviationHistory, lastUpdated } = useMarketPrices(chainId, feedPricesRef);
  const { updatePrice, loading } = useOracleWriter();

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
    networkConfig: getNetworkConfig(chainId),
  };
}
