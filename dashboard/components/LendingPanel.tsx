"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/src/app/Context";
import type { FeedPrice } from "@/src/app/types";

// ── Contract Addresses (fill in after deployment) ─────────────────────────────

const LENDING_POOL_ADDRESS = "0x0000000000000000000000000000000000000000";
const MXT_ADDRESS          = "0x0000000000000000000000000000000000000000";
const WETH_ADDRESS         = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81"; // Sepolia WETH

const IS_DEPLOYED = LENDING_POOL_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ── ABIs ──────────────────────────────────────────────────────────────────────

const LENDING_POOL_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function borrow(uint256 amount) external",
  "function repay(uint256 amount) external",
  "function getPositionSummary(address user) external view returns (uint256 collateral, uint256 debt, uint256 collateralValueUSD, uint256 debtValueUSD, uint256 healthFactor, uint256 maxBorrow)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionTab = "deposit" | "borrow" | "repay" | "withdraw";

interface Position {
  collateral:      number; // WETH (18 dec → display)
  debt:            number; // MXT  (18 dec → display)
  collateralUSD:   number;
  debtUSD:         number;
  healthFactor:    number; // raw 1e18 → divide for display
  maxBorrow:       number; // MXT
}

interface Props {
  feedPrices: Record<string, FeedPrice>;
}

// ── Health factor helpers ─────────────────────────────────────────────────────

function hfColor(hf: number): string {
  if (hf >= 2.0)  return "text-green-400";
  if (hf >= 1.25) return "text-yellow-400";
  if (hf >= 1.0)  return "text-orange-400";
  return "text-red-400";
}

function hfBarColor(hf: number): string {
  if (hf >= 2.0)  return "bg-green-500";
  if (hf >= 1.25) return "bg-yellow-500";
  if (hf >= 1.0)  return "bg-orange-500";
  return "bg-red-500";
}

function hfLabel(hf: number): string {
  if (hf >= 2.0)  return "Safe";
  if (hf >= 1.25) return "Moderate";
  if (hf >= 1.0)  return "At risk";
  return "Liquidatable";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LendingPanel({ feedPrices }: Props) {
  const { provider, signer, address } = useWeb3();

  const [tab,          setTab]         = useState<ActionTab>("deposit");
  const [amount,       setAmount]      = useState("");
  const [position,     setPosition]    = useState<Position | null>(null);
  const [wethBal,      setWethBal]     = useState<string | null>(null);
  const [mxtBal,       setMxtBal]      = useState<string | null>(null);
  const [loading,      setLoading]     = useState(false);
  const [approving,    setApproving]   = useState(false);
  const [txHash,       setTxHash]      = useState<string | null>(null);
  const [error,        setError]       = useState<string | null>(null);
  const [fetching,     setFetching]    = useState(false);

  const ethPrice = feedPrices["eth"]?.price ?? null;

  // ── Fetch position ──────────────────────────────────────────────────────────

  const fetchPosition = useCallback(async () => {
    if (!address || !IS_DEPLOYED) return;
    const p = provider ?? new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    setFetching(true);
    try {
      const pool   = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, p);
      const result = await pool.getPositionSummary(address);
      setPosition({
        collateral:    parseFloat(ethers.formatEther(result[0])),
        debt:          parseFloat(ethers.formatEther(result[1])),
        collateralUSD: parseFloat(ethers.formatEther(result[2])),
        debtUSD:       parseFloat(ethers.formatEther(result[3])),
        healthFactor:  result[4] === BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
                         ? Infinity
                         : parseFloat(ethers.formatEther(result[4])),
        maxBorrow:     parseFloat(ethers.formatEther(result[5])),
      });
    } catch (err) {
      console.error("Position fetch error:", err);
    } finally {
      setFetching(false);
    }
  }, [address, provider]);

  // ── Fetch balances ──────────────────────────────────────────────────────────

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    const p = provider ?? new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    try {
      const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, p);
      const wRaw = await weth.balanceOf(address) as bigint;
      setWethBal(parseFloat(ethers.formatEther(wRaw)).toFixed(4));

      if (MXT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        const mxt  = new ethers.Contract(MXT_ADDRESS, ERC20_ABI, p);
        const mRaw = await mxt.balanceOf(address) as bigint;
        setMxtBal(parseFloat(ethers.formatEther(mRaw)).toFixed(2));
      }
    } catch {
      // silently fail
    }
  }, [address, provider]);

  useEffect(() => {
    fetchPosition();
    fetchBalances();
  }, [fetchPosition, fetchBalances]);

  // ── Action helpers ──────────────────────────────────────────────────────────

  function resetState() {
    setError(null);
    setTxHash(null);
  }

  async function approveERC20(tokenAddress: string, spender: string, amount: bigint) {
    if (!signer) return;
    const token     = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const allowance = await token.allowance(address, spender) as bigint;
    if (allowance < amount) {
      setApproving(true);
      await (await token.approve(spender, amount)).wait();
      setApproving(false);
    }
  }

  async function runTx(fn: () => Promise<void>) {
    if (!signer) { setError("Connect wallet first"); return; }
    resetState();
    setLoading(true);
    try {
      await fn();
      setAmount("");
      await fetchPosition();
      await fetchBalances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("user rejected") ? "Transaction rejected."
        : msg.includes("LP:") ? msg.split("LP: ")[1] ?? "Contract error."
        : "Transaction failed."
      );
    } finally {
      setLoading(false);
      setApproving(false);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function deposit() {
    await runTx(async () => {
      const pool = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, signer!);
      const amt  = ethers.parseEther(amount);
      await approveERC20(WETH_ADDRESS, LENDING_POOL_ADDRESS, amt);
      const tx   = await pool.deposit(amt);
      setTxHash(tx.hash);
      await tx.wait();
    });
  }

  async function withdraw() {
    await runTx(async () => {
      const pool = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, signer!);
      const tx   = await pool.withdraw(ethers.parseEther(amount));
      setTxHash(tx.hash);
      await tx.wait();
    });
  }

  async function borrow() {
    await runTx(async () => {
      const pool = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, signer!);
      const tx   = await pool.borrow(ethers.parseEther(amount));
      setTxHash(tx.hash);
      await tx.wait();
    });
  }

  async function repay() {
    await runTx(async () => {
      const pool = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, signer!);
      const amt  = ethers.parseEther(amount);
      await approveERC20(MXT_ADDRESS, LENDING_POOL_ADDRESS, amt);
      const tx   = await pool.repay(amt);
      setTxHash(tx.hash);
      await tx.wait();
    });
  }

  // ── Tab config ───────────────────────────────────────────────────────────────

  const TABS: { key: ActionTab; label: string; action: () => void; token: string; balance: string | null }[] = [
    { key: "deposit",  label: "Deposit",  action: deposit,  token: "WETH", balance: wethBal },
    { key: "borrow",   label: "Borrow",   action: borrow,   token: "MXT",  balance: null    },
    { key: "repay",    label: "Repay",    action: repay,    token: "MXT",  balance: mxtBal  },
    { key: "withdraw", label: "Withdraw", action: withdraw, token: "WETH", balance: position ? position.collateral.toFixed(4) : null },
  ];

  const activeTab = TABS.find(t => t.key === tab)!;

  const hf    = position?.healthFactor ?? null;
  const hfPct = hf !== null ? Math.min((hf / 3) * 100, 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl mb-6 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-base tracking-wide">MaveriX Lending</h3>
            <p className="text-gray-500 text-xs mt-0.5">Deposit WETH · Borrow MXT · 5% APR</p>
          </div>
          <div className="flex items-center gap-2">
            {!IS_DEPLOYED && (
              <span className="text-xs text-yellow-400 border border-yellow-700/40 bg-yellow-900/20
                               px-2 py-1 rounded-lg">
                Not deployed
              </span>
            )}
            <span className="text-xs text-gray-600 border border-[#30363d] px-2 py-1 rounded-lg">Sepolia</span>
          </div>
        </div>
      </div>

      {/* ── Not deployed notice ─────────────────────────────────────────────── */}
      {!IS_DEPLOYED && (
        <div className="mx-5 mt-4 mb-0 p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-gray-500 space-y-1.5">
          <p className="text-gray-300 font-medium mb-2">Deploy to activate</p>
          <p>Run the deploy script on Sepolia, then paste the contract addresses:</p>
          <code className="block bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-gray-400 leading-6">
            forge script script/DeployLending.s.sol \<br/>
            {"  "}--rpc-url sepolia --broadcast
          </code>
          <p className="text-gray-600 pt-1">
            Then update <span className="text-blue-400">LENDING_POOL_ADDRESS</span> and{" "}
            <span className="text-blue-400">MXT_ADDRESS</span> in <span className="font-mono">LendingPanel.tsx</span>.
          </p>
        </div>
      )}

      <div className="p-5 space-y-4">

        {/* ── Position summary ────────────────────────────────────────────────── */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Your Position</span>
            {fetching && (
              <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            )}
            {address && IS_DEPLOYED && (
              <button
                onClick={() => { fetchPosition(); fetchBalances(); }}
                className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
              >
                ↻ refresh
              </button>
            )}
          </div>

          {/* Health factor */}
          {hf !== null && (
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-gray-500 text-xs">Health Factor</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-bold text-xl ${hfColor(hf)}`}>
                    {hf === Infinity ? "∞" : hf.toFixed(2)}
                  </span>
                  <span className={`text-xs ${hfColor(hf)}`}>{hfLabel(hf)}</span>
                </div>
              </div>
              {/* Health bar */}
              <div className="w-full bg-[#1c2333] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${hfBarColor(hf)}`}
                  style={{ width: `${hfPct}%` }}
                />
              </div>
              <div className="flex justify-between text-gray-700 text-xs mt-1">
                <span>1.0 (liquidation)</span>
                <span>3.0+</span>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#161b22] rounded-lg p-3">
              <p className="text-gray-600 text-xs mb-1">Collateral</p>
              <p className="text-white font-mono">
                {position ? `${position.collateral.toFixed(4)} WETH` : IS_DEPLOYED && address ? "—" : "0.0000 WETH"}
              </p>
              {position && ethPrice && (
                <p className="text-gray-600 text-xs mt-0.5">
                  ${(position.collateral * ethPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="bg-[#161b22] rounded-lg p-3">
              <p className="text-gray-600 text-xs mb-1">Debt</p>
              <p className="text-white font-mono">
                {position ? `${position.debt.toFixed(2)} MXT` : IS_DEPLOYED && address ? "—" : "0.00 MXT"}
              </p>
              {position && (
                <p className="text-gray-600 text-xs mt-0.5">
                  ${position.debtUSD.toFixed(2)}
                </p>
              )}
            </div>
            <div className="bg-[#161b22] rounded-lg p-3">
              <p className="text-gray-600 text-xs mb-1">Max borrow</p>
              <p className="text-white font-mono">
                {position ? `${position.maxBorrow.toFixed(2)} MXT` : "—"}
              </p>
            </div>
            <div className="bg-[#161b22] rounded-lg p-3">
              <p className="text-gray-600 text-xs mb-1">Borrow APR</p>
              <p className="text-orange-400 font-mono font-semibold">5.00%</p>
              <p className="text-gray-600 text-xs mt-0.5">accrued per second</p>
            </div>
          </div>

          {!address && (
            <p className="text-gray-600 text-xs text-center mt-3">Connect wallet to view position</p>
          )}
        </div>

        {/* ── Protocol parameters ─────────────────────────────────────────────── */}
        <div className="border border-[#30363d] rounded-xl divide-y divide-[#30363d]/50 text-xs">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-500">Collateral factor (max LTV)</span>
            <span className="text-gray-300">75%</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-500">Liquidation threshold</span>
            <span className="text-gray-300">80%</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-500">Liquidation bonus</span>
            <span className="text-gray-300">+10%</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-500">Collateral asset</span>
            <span className="text-blue-400 font-mono">WETH</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-500">Borrow asset</span>
            <span className="text-violet-400 font-mono">MXT (1 MXT = $1)</span>
          </div>
        </div>

        {/* ── Action tabs (only if wallet connected) ──────────────────────────── */}
        {address && (
          <div>
            {/* Tab row */}
            <div className="flex gap-1 bg-[#0d1117] border border-[#30363d] rounded-xl p-1 mb-3">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setAmount(""); resetState(); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${tab === t.key
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow"
                      : "text-gray-500 hover:text-gray-300"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input box */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 hover:border-[#444c56] transition-colors">
              <div className="flex justify-between mb-3">
                <span className="text-gray-500 text-xs">{activeTab.label} {activeTab.token}</span>
                {activeTab.balance !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-xs">Bal: {activeTab.balance}</span>
                    {parseFloat(activeTab.balance) > 0 && (
                      <button
                        onClick={() => setAmount(activeTab.balance!)}
                        className="text-violet-400 hover:text-violet-300 text-xs font-medium
                                   bg-violet-900/20 border border-violet-700/30 rounded px-1.5 py-0.5"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                )}
                {tab === "borrow" && position && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-xs">Max: {position.maxBorrow.toFixed(2)} MXT</span>
                    <button
                      onClick={() => setAmount(position.maxBorrow.toFixed(4))}
                      className="text-violet-400 hover:text-violet-300 text-xs font-medium
                                 bg-violet-900/20 border border-violet-700/30 rounded px-1.5 py-0.5"
                    >
                      MAX
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  disabled={!IS_DEPLOYED}
                  className="flex-1 bg-transparent text-white text-3xl font-light outline-none
                             placeholder-gray-700 min-w-0
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                             [&::-webkit-inner-spin-button]:appearance-none
                             disabled:opacity-40"
                />
                <span className={`shrink-0 border rounded-full px-3 py-1.5 text-sm font-semibold
                  ${activeTab.token === "WETH"
                    ? "bg-blue-900/60 text-blue-300 border-blue-700/50"
                    : "bg-violet-900/60 text-violet-300 border-violet-700/50"}`}
                >
                  {activeTab.token}
                </span>
              </div>

              {/* USD equivalent for WETH inputs */}
              {(tab === "deposit" || tab === "withdraw") && amount && ethPrice && (
                <p className="text-gray-600 text-xs mt-2">
                  ≈ ${(parseFloat(amount) * ethPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Status messages */}
            {approving && (
              <div className="flex items-center gap-2 text-yellow-400 text-xs mt-3
                              bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
                <div className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0" />
                Approving token spend… confirm in wallet
              </div>
            )}
            {error && (
              <div className="text-red-400 text-xs mt-3 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">
                ⚠ {error}
              </div>
            )}
            {txHash && (
              <div className="flex items-center gap-2 text-green-400 text-xs mt-3
                              bg-green-950/30 border border-green-800/40 rounded-xl px-4 py-3">
                <span>✓ Confirmed —</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-green-300"
                >
                  {txHash.slice(0, 10)}…{txHash.slice(-6)}
                </a>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={activeTab.action}
              disabled={!IS_DEPLOYED || loading || approving || !amount || parseFloat(amount) <= 0}
              className="w-full mt-3 py-3.5 rounded-xl font-semibold text-sm
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         enabled:hover:brightness-110 enabled:hover:shadow-lg
                         enabled:hover:shadow-violet-900/40
                         bg-gradient-to-r from-violet-600 to-purple-600
                         disabled:from-gray-700 disabled:to-gray-700
                         disabled:text-gray-400 enabled:text-white"
            >
              {approving ? "Approving…"
                : loading ? `${activeTab.label}ing…`
                : !IS_DEPLOYED ? "Deploy contract first"
                : `${activeTab.label} ${activeTab.token}`}
            </button>
          </div>
        )}

        {!address && IS_DEPLOYED && (
          <p className="text-gray-600 text-xs text-center py-2">
            Connect your wallet to interact with the lending pool
          </p>
        )}

      </div>
    </div>
  );
}
