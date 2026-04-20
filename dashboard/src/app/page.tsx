"use client";

import { motion } from "framer-motion";
import { useOracle } from "./hooks/useOracle";
import { useWeb3 } from "./context/Web3Provider";
import PriceChart from "../../components/pricechart";
import StatsPanel from "../../components/statspanel";
import OracleHealthPanel from "../../components/OracleHealthPanel";
import MultiFeedGrid from "../../components/MultiFeedGrid";
import DeviationChart from "../../components/DeviationChart";
import PriceAlerts from "../../components/PriceAlerts";
import OracleDeviationAlerts from "../../components/OracleDeviationAlerts";
import OracleComparisonPanel from "../../components/OracleComparisonPanel";
import PositionRiskCalculator from "../../components/PositionRiskCalculator";
import EventLog from "../../components/EventLog";
import NetworkMonitor from "../../components/NetworkMonitor";
import RoundExplorer from "../../components/RoundExplorer";
import WalletPanel from "../../components/WalletPanel";
import SwapPanel from "../../components/SwapPanel";
import LendingPanel from "../../components/LendingPanel";
import YieldPanel from "../../components/YieldPanel";

export default function Dashboard() {
  const {
    price,
    marketPrice,
    lastUpdated,
    loading,
    feedPrices,
    marketPrices,
    deviationHistory,
    eventLog,
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
  } = useOracle();
  const { address, connect, disconnect, walletName, chainId } = useWeb3();

  const explorerBase = chainId === 1
    ? "https://etherscan.io"
    : "https://sepolia.etherscan.io";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8">

        {/* HEADER */}
        <div className="flex justify-between items-center pb-6 mb-8 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">
              MAVERIX <span className="text-blue-400">ORACLE</span> TERMINAL
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Live Chainlink Data Dashboard</p>
          </div>
          <div className="flex gap-3 items-center">
            {address ? (
              <>
                <span className="text-sm text-muted-foreground bg-card border border-border px-3 py-1.5 rounded font-mono">
                  {walletName && <span className="text-blue-400 mr-2">{walletName}</span>}
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="border border-border hover:border-red-500 hover:text-red-400 transition-colors px-4 py-2 rounded text-sm font-medium text-muted-foreground"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                className="bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 rounded text-sm font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* NETWORK + WALLET — top info bar */}
        <NetworkMonitor />
        <WalletPanel />

        {/* LIVE PRICE FEEDS */}
        <MultiFeedGrid
          feeds={networkConfig.feeds}
          feedPrices={feedPrices}
          marketPrices={marketPrices}
        />

        {/* ETH PRICE PANEL */}
        <motion.div
          key={price}
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border p-6 rounded-lg mb-6"
        >
          <h2 className="text-muted-foreground text-xs uppercase tracking-widest mb-3">ETH / USD — Oracle Price</h2>
          <div className="text-5xl font-bold text-green-400">${price}</div>
          {loading && <p className="text-muted-foreground text-sm mt-2">Updating...</p>}
        </motion.div>

        {/* ORACLE HEALTH */}
        <div className="mb-6">
          <OracleHealthPanel
            oraclePrice={price}
            marketPrice={marketPrice}
            lastUpdated={lastUpdated}
          />
        </div>

        {/* MARKET STATS */}
        <div className="mb-6">
          <StatsPanel />
        </div>

        {/* PRICE CHART */}
        <div className="bg-card border border-border p-6 rounded-lg mb-6">
          <h2 className="text-muted-foreground text-xs uppercase tracking-widest mb-4">Price Chart</h2>
          <div className="h-[500px]">
            <PriceChart />
          </div>
        </div>

        {/* DEVIATION HISTORY */}
        <DeviationChart history={deviationHistory} />

        {/* ORACLE SOURCE COMPARISON */}
        <OracleComparisonPanel
          snapshots={comparisonSnapshots}
          history={comparisonHistory}
        />

        {/* POSITION RISK CALCULATOR */}
        <PositionRiskCalculator
          feedPrices={feedPrices}
          aavePosition={aavePosition}
          aaveLoading={aaveLoading}
          walletConnected={!!address}
        />

        {/* SWAP + LENDING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SwapPanel feedPrices={feedPrices} />
          <LendingPanel feedPrices={feedPrices} />
        </div>

        {/* YIELD RATES */}
        <div className="mb-6">
          <YieldPanel />
        </div>

        {/* ALERTS + EVENT LOG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <PriceAlerts alerts={alerts} onAdd={addAlert} onRemove={removeAlert} />
          <EventLog entries={eventLog} />
        </div>

        {/* ORACLE DEVIATION ALERTS */}
        <div className="mb-6">
          <OracleDeviationAlerts
            alerts={deviationAlerts}
            feeds={networkConfig.feeds}
            onAdd={addDeviationAlert}
            onRemove={removeDeviationAlert}
            onReset={resetDeviationAlert}
          />
        </div>

        {/* ROUND EXPLORER */}
        <div className="mb-6">
          <RoundExplorer
            latestRoundId={feedPrices["eth"]?.roundId ?? null}
            oracleAddress={networkConfig.oracleAddress}
          />
        </div>

        {/* FOOTER — contract link */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">MaveriX Oracle Terminal</span>
          <span>
            {networkConfig.label}{chainId ? ` · Chain ${chainId}` : ""} ·{" "}
            <a
              href={`${explorerBase}/address/${networkConfig.oracleAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline font-mono"
            >
              {networkConfig.oracleAddress.slice(0, 6)}...{networkConfig.oracleAddress.slice(-4)}
            </a>
          </span>
        </div>

      </div>
    </main>
  );
}
