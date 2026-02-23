"use client";

import { useOracle } from "./hooks/useOracle";
import PriceChart from "../../components/pricechart";
import StatsPanel from "../../components/statspanel";
import  OracleHealthPanel   from "../../components/OracleHealthPanel";







export default function Dashboard() {
  const {
  price,
  marketPrice,
  lastUpdated,
  loading,
  connectWallet,
  account,
} = useOracle();
  return (
    <main className="min-h-screen bg-[#0d1117] text-white p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-wide">
          MAVERIX ORACLE TERMINAL
        </h1>

        <div className="flex gap-4 items-center">
          {account && (
            <span className="text-sm text-gray-400">
              {account.slice(0,6)}...{account.slice(-4)}
            </span>
          )}
          <button
            onClick={connectWallet}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
          >
            Connect Wallet
          </button>
        </div>
      </div>

      {/* PRICE PANEL */}
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6">
        <h2 className="text-gray-400 text-sm mb-2">ETH / USD</h2>
        <div className="text-5xl font-bold text-green-400">
          ${price}
        </div>
        {loading && (
          <p className="text-gray-500 mt-2">Updating...</p>
        )}
        <StatsPanel />
        <OracleHealthPanel
  oraclePrice={price}
  marketPrice={marketPrice}
  lastUpdated={lastUpdated}
/>

      </div>

      {/* CHART PANEL */}
<div className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6">
  <h2 className="text-gray-400 text-sm mb-4">Price Chart</h2>

  <div className="h-[500px]">
    <PriceChart />
  </div>
</div>

      {/* ORACLE STATUS */}
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded">
        <h2 className="text-gray-400 text-sm mb-4">Oracle Status</h2>
        <p className="text-sm text-gray-400">
          Contract: 0x5FbDB2...0aa3
        </p>
        <p className="text-sm text-gray-400">
          Network: Local Anvil (31337)
        </p>
      </div>

    </main>
  );
}
