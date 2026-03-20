"use client";

import { useState, useEffect } from "react";

// ── DeFi Llama types ──────────────────────────────────────────────────────────

interface LlamaPool {
  pool:       string;
  chain:      string;
  project:    string;
  symbol:     string;
  tvlUsd:     number;
  apy:        number;
  apyBase:    number | null;
  apyReward:  number | null;
  apyBorrow?: number | null;
}

interface DisplayPool {
  symbol:    string;
  protocol:  string;
  supplyApy: number;
  rewardApy: number;
  borrowApy: number | null;
  tvlUsd:    number;
  chain:     string;
}

// ── Asset filters ─────────────────────────────────────────────────────────────

const TARGET_SYMBOLS  = ["WETH", "ETH", "WBTC", "USDC", "USDT", "LINK", "DAI"];
const TARGET_PROJECTS = ["aave-v3", "compound-v3", "morpho", "spark", "fluid"];
const CHAINS          = ["Ethereum", "Arbitrum", "Optimism", "Base"];

const PROJECT_LABELS: Record<string, string> = {
  "aave-v3":    "Aave V3",
  "compound-v3":"Compound V3",
  "morpho":     "Morpho",
  "spark":      "Spark",
  "fluid":      "Fluid",
};

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtApy(apy: number | null | undefined): string {
  if (!apy || apy <= 0) return "—";
  if (apy >= 100) return ">100%";
  return `${apy.toFixed(2)}%`;
}

function fmtTvl(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

function apyColor(apy: number): string {
  if (apy >= 10) return "text-green-400";
  if (apy >= 4)  return "text-green-500";
  if (apy >= 1)  return "text-yellow-400";
  return "text-gray-500";
}

// Symbol display normalisation
function normaliseSymbol(raw: string): string {
  if (raw.includes("WETH") || raw === "ETH") return "WETH/ETH";
  if (raw.includes("WBTC"))  return "WBTC";
  if (raw.includes("USDC"))  return "USDC";
  if (raw.includes("USDT"))  return "USDT";
  if (raw.includes("DAI"))   return "DAI";
  if (raw.includes("LINK"))  return "LINK";
  return raw;
}

const SYMBOL_COLORS: Record<string, string> = {
  "WETH/ETH": "bg-blue-900/60 text-blue-300 border-blue-700/50",
  "WBTC":     "bg-orange-900/60 text-orange-300 border-orange-700/50",
  "USDC":     "bg-teal-900/60 text-teal-300 border-teal-700/50",
  "USDT":     "bg-green-900/60 text-green-300 border-green-700/50",
  "DAI":      "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
  "LINK":     "bg-indigo-900/60 text-indigo-300 border-indigo-700/50",
};

type FilterTab = "All" | "WETH/ETH" | "Stables" | "LINK";

// ── Component ─────────────────────────────────────────────────────────────────

export default function YieldPanel() {
  const [pools,      setPools]      = useState<DisplayPool[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter,     setFilter]     = useState<FilterTab>("All");
  const [sortBy,     setSortBy]     = useState<"supplyApy" | "tvlUsd">("supplyApy");

  useEffect(() => {
    async function fetchYields() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://yields.llama.fi/pools", {
          next: { revalidate: 300 }, // 5 min cache if running SSR
        } as RequestInit);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = await res.json() as { data: LlamaPool[] };

        const filtered: DisplayPool[] = data
          .filter(p =>
            TARGET_PROJECTS.includes(p.project) &&
            CHAINS.includes(p.chain) &&
            TARGET_SYMBOLS.some(s => p.symbol.toUpperCase().includes(s)) &&
            p.tvlUsd >= 100_000 // skip tiny pools
          )
          .map(p => ({
            symbol:    normaliseSymbol(p.symbol.toUpperCase()),
            protocol:  PROJECT_LABELS[p.project] ?? p.project,
            supplyApy: p.apy ?? 0,
            rewardApy: p.apyReward ?? 0,
            borrowApy: p.apyBorrow ?? null,
            tvlUsd:    p.tvlUsd,
            chain:     p.chain,
          }))
          // deduplicate (keep highest APY per symbol+protocol+chain)
          .reduce<DisplayPool[]>((acc, pool) => {
            const key = `${pool.symbol}-${pool.protocol}-${pool.chain}`;
            const existing = acc.findIndex(
              p => `${p.symbol}-${p.protocol}-${p.chain}` === key
            );
            if (existing === -1) return [...acc, pool];
            if (pool.supplyApy > acc[existing].supplyApy) acc[existing] = pool;
            return acc;
          }, []);

        setPools(filtered);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("DeFi Llama fetch error:", err);
        setError("Could not fetch yield data. DeFi Llama may be rate-limited.");
      } finally {
        setLoading(false);
      }
    }

    fetchYields();
    const interval = setInterval(fetchYields, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // ── Filter + sort ──────────────────────────────────────────────────────────

  const displayed = pools
    .filter(p => {
      if (filter === "All")     return true;
      if (filter === "Stables") return ["USDC", "USDT", "DAI"].includes(p.symbol);
      return p.symbol === filter;
    })
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 12);

  const FILTER_TABS: FilterTab[] = ["All", "WETH/ETH", "LINK", "Stables"];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl mb-6 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[#30363d]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold text-base tracking-wide">Yield Rates</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              Live lending rates across Aave, Compound, Morpho & more
            </p>
          </div>
          <div className="text-right">
            {lastUpdate && (
              <p className="text-gray-700 text-xs">
                Updated {lastUpdate.toLocaleTimeString()}
              </p>
            )}
            <span className="text-xs text-gray-600 border border-[#30363d] px-2 py-1 rounded-lg mt-1 inline-block">
              DeFi Llama
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">

        {/* ── Filter + Sort row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-[#0d1117] border border-[#30363d] rounded-xl p-1">
            {FILTER_TABS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filter === f
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                    : "text-gray-500 hover:text-gray-300"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setSortBy("supplyApy")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors
                ${sortBy === "supplyApy"
                  ? "border-violet-700/50 text-violet-300 bg-violet-900/20"
                  : "border-[#30363d] text-gray-600 hover:text-gray-400"}`}
            >
              APY ↓
            </button>
            <button
              onClick={() => setSortBy("tvlUsd")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors
                ${sortBy === "tvlUsd"
                  ? "border-violet-700/50 text-violet-300 bg-violet-900/20"
                  : "border-[#30363d] text-gray-600 hover:text-gray-400"}`}
            >
              TVL ↓
            </button>
          </div>
        </div>

        {/* ── Loading / Error ───────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-3 py-8 justify-center text-gray-500 text-sm">
            <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            Fetching yield data…
          </div>
        )}

        {error && !loading && (
          <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3 mb-3">
            ⚠ {error}
          </div>
        )}

        {/* ── Pool table ────────────────────────────────────────────────────── */}
        {!loading && displayed.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#30363d]">
            {/* Table header */}
            <div className="grid grid-cols-12 px-4 py-2.5 bg-[#0d1117]
                            text-gray-600 text-xs font-medium uppercase tracking-wider">
              <span className="col-span-3">Asset</span>
              <span className="col-span-3">Protocol</span>
              <span className="col-span-2 text-right">Supply APY</span>
              <span className="col-span-2 text-right">Reward APY</span>
              <span className="col-span-2 text-right">TVL</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#30363d]/50">
              {displayed.map((pool, i) => {
                const symColor = SYMBOL_COLORS[pool.symbol] ?? "bg-gray-800 text-gray-400 border-gray-700";
                return (
                  <div
                    key={`${pool.symbol}-${pool.protocol}-${pool.chain}-${i}`}
                    className="grid grid-cols-12 px-4 py-3 hover:bg-[#1c2333] transition-colors items-center"
                  >
                    {/* Asset */}
                    <div className="col-span-3 flex items-center gap-2">
                      <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${symColor}`}>
                        {pool.symbol}
                      </span>
                    </div>

                    {/* Protocol + Chain */}
                    <div className="col-span-3">
                      <p className="text-gray-300 text-xs">{pool.protocol}</p>
                      <p className="text-gray-600 text-xs">{pool.chain}</p>
                    </div>

                    {/* Supply APY */}
                    <div className="col-span-2 text-right">
                      <span className={`font-mono font-semibold text-sm ${apyColor(pool.supplyApy)}`}>
                        {fmtApy(pool.supplyApy)}
                      </span>
                    </div>

                    {/* Reward APY */}
                    <div className="col-span-2 text-right">
                      {pool.rewardApy > 0 ? (
                        <span className="text-purple-400 font-mono text-xs">
                          +{fmtApy(pool.rewardApy)}
                        </span>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </div>

                    {/* TVL */}
                    <div className="col-span-2 text-right">
                      <span className="text-gray-400 font-mono text-xs">{fmtTvl(pool.tvlUsd)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && displayed.length === 0 && !error && (
          <div className="text-center py-8 text-gray-600 text-sm">
            No pools found for this filter.
          </div>
        )}

        {/* ── MaveriX lending rate callout ──────────────────────────────────── */}
        <div className="mt-4 flex items-center justify-between bg-[#0d1117] border border-violet-800/30
                        rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <div>
              <p className="text-gray-300 text-xs font-medium">MaveriX Lending (MXT)</p>
              <p className="text-gray-600 text-xs">Your protocol · WETH collateral</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-orange-400 font-mono font-semibold text-sm">5.00% APR</p>
            <p className="text-gray-600 text-xs">borrow rate</p>
          </div>
        </div>

        <p className="text-gray-700 text-xs text-center mt-3">
          Data from DeFi Llama · Mainnet rates · Refreshes every 5 min
        </p>
      </div>
    </div>
  );
}
