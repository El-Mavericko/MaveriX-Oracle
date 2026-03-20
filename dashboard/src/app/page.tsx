"use client";

import { motion } from "framer-motion";
import { useOracle } from "./hooks/useOracle";
import { useWeb3 } from "./Context/Web3Provider";
import PriceChart from "../../components/pricechart";
import StatsPanel from "../../components/statspanel";
import OracleHealthPanel from "../../components/OracleHealthPanel";
import MultiFeedGrid from "../../components/MultiFeedGrid";
import DeviationChart from "../../components/DeviationChart";
import PriceAlerts from "../../components/PriceAlerts";
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
    networkConfig,
  } = useOracle();
  const { address, connect, chainId } = useWeb3();

  const explorerBase = chainId === 1
    ? "https://etherscan.io"
    : "https://sepolia.etherscan.io";

  return (
    <main className="min-h-screen bg-[#0d1117] text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-wide">
          MAVERIX ORACLE TERMINAL
        </h1>
        <div className="flex gap-4 items-center">
          {address && (
            <span className="text-sm text-gray-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
          <button
            onClick={connect}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
          >
            {address ? "Connected" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {/* NETWORK MONITOR */}
      <NetworkMonitor />

      {/* WALLET PANEL */}
      <WalletPanel />

      {/* SWAP + LENDING side by side on lg screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SwapPanel feedPrices={feedPrices} />
        <LendingPanel feedPrices={feedPrices} />
      </div>

      {/* YIELD RATES — full width */}
      <YieldPanel />

      {/* MULTI-FEED GRID */}
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
        className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6"
      >
        <h2 className="text-gray-400 text-sm mb-2">ETH / USD</h2>
        <div className="text-5xl font-bold text-green-400">${price}</div>
        {loading && <p className="text-gray-500 mt-2">Updating...</p>}
        <StatsPanel />
        <OracleHealthPanel
          oraclePrice={price}
          marketPrice={marketPrice}
          lastUpdated={lastUpdated}
        />
      </motion.div>

      {/* DEVIATION HISTORY */}
      <DeviationChart history={deviationHistory} />

      {/* PRICE CHART */}
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6">
        <h2 className="text-gray-400 text-sm mb-4">Price Chart</h2>
        <div className="h-[500px]">
          <PriceChart />
        </div>
      </div>

      {/* ALERTS + EVENT LOG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <PriceAlerts alerts={alerts} onAdd={addAlert} onRemove={removeAlert} />
        <EventLog entries={eventLog} />
      </div>

      {/* ROUND EXPLORER */}
      <RoundExplorer
        latestRoundId={feedPrices["eth"]?.roundId ?? null}
        oracleAddress={networkConfig.oracleAddress}
      />

      {/* ORACLE STATUS */}
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded">
        <h2 className="text-gray-400 text-sm mb-4">Oracle Status</h2>
        <p className="text-sm text-gray-400">
          Contract:{" "}
          <a
            href={`${explorerBase}/address/${networkConfig.oracleAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            {networkConfig.oracleAddress.slice(0, 6)}...{networkConfig.oracleAddress.slice(-4)}
          </a>
        </p>
        <p className="text-sm text-gray-400">
          Network: {networkConfig.label}{chainId ? ` (${chainId})` : ""}
        </p>
      </div>

    </main>
  );
}
