
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/src/app/context";
import { SWAP_SLIPPAGE_TOLERANCE, SWAP_QUOTE_DEBOUNCE_MS, UNISWAP_FEE_TIER_LOW, UNISWAP_FEE_TIER_MEDIUM, PRICE_IMPACT_HIGH_PCT, PRICE_IMPACT_MEDIUM_PCT, PRICE_IMPACT_MIN_DISPLAY } from "@/src/app/constants";
import type { FeedPrice } from "@/src/app/types";

// ── Uniswap V3 Sepolia ────────────────────────────────────────────────────────

const QUOTER_V2    = "0xEd1f6473345F45b75833fd55D191EaA8eF1E02B5";
const SWAP_ROUTER2 = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48";

// ── ABIs ──────────────────────────────────────────────────────────────────────

const QUOTER_V2_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];
const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
];

// ── Tokens ────────────────────────────────────────────────────────────────────

type TokenKey = "WETH" | "USDC" | "LINK";

interface Token {
  symbol:    TokenKey;
  address:   string;
  decimals:  number;
  oracleKey: string | null;
  color:     string;           // accent colour for the token badge
}

const TOKENS: Record<TokenKey, Token> = {
  WETH: { symbol: "WETH", address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", decimals: 18, oracleKey: "eth",  color: "bg-blue-900/60  text-blue-300  border-blue-700/50"  },
  USDC: { symbol: "USDC", address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", decimals: 6,  oracleKey: null, color: "bg-teal-900/60  text-teal-300  border-teal-700/50"  },
  LINK: { symbol: "LINK", address: "0x779877A7B0D9E8603169DdbD7836e478b4624789", decimals: 18, oracleKey: "link", color: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50" },
};

const TOKEN_KEYS = Object.keys(TOKENS) as TokenKey[];

function getFeeTier(from: TokenKey, to: TokenKey): number {
  if (from === "USDC" || to === "USDC") return UNISWAP_FEE_TIER_LOW;
  return UNISWAP_FEE_TIER_MEDIUM;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenUSD(key: TokenKey, feedPrices: Record<string, FeedPrice>): number | null {
  if (key === "USDC") return 1.0;
  const ok = TOKENS[key].oracleKey;
  return ok ? (feedPrices[ok]?.price ?? null) : null;
}

function getOracleRate(from: TokenKey, to: TokenKey, fp: Record<string, FeedPrice>): number | null {
  const f = tokenUSD(from, fp);
  const t = tokenUSD(to,   fp);
  return f && t ? f / t : null;
}

function fmtAmount(n: number, dec: number): string {
  if (dec === 6) return n.toFixed(2);
  if (n < 0.000001) return n.toExponential(4);
  return n.toFixed(6);
}

function fmtUSD(usd: number): string {
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  feedPrices: Record<string, FeedPrice>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwapPanel({ feedPrices }: Props) {
  const { provider, signer, address } = useWeb3();

  const [fromToken, setFromToken] = useState<TokenKey>("WETH");
  const [toToken,   setToToken]   = useState<TokenKey>("USDC");
  const [amountIn,  setAmountIn]  = useState("");

  // Balances
  const [fromBal, setFromBal] = useState<string | null>(null);
  const [toBal,   setToBal]   = useState<string | null>(null);

  // Quote
  const [quoteOut,    setQuoteOut]    = useState<string | null>(null);
  const [uniRate,     setUniRate]     = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [gasEst,      setGasEst]      = useState<string | null>(null);
  const [quoting,     setQuoting]     = useState(false);
  const [quoteError,  setQuoteError]  = useState<string | null>(null);

  // Tx
  const [swapping,  setSwapping]  = useState(false);
  const [approving, setApproving] = useState(false);
  const [txHash,    setTxHash]    = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Overview expanded
  const [overviewOpen, setOverviewOpen] = useState(true);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch balances ─────────────────────────────────────────────────────────

  const fetchBalance = useCallback(
    async (tokenKey: TokenKey): Promise<string | null> => {
      if (!address) return null;
      const p = provider ?? new ethers.JsonRpcProvider("https://rpc.sepolia.org");
      try {
        const tok = TOKENS[tokenKey];
        const c   = new ethers.Contract(tok.address, ERC20_ABI, p);
        const raw = await c.balanceOf(address) as bigint;
        return parseFloat(ethers.formatUnits(raw, tok.decimals)).toFixed(
          tok.decimals === 6 ? 2 : 4
        );
      } catch {
        return null;
      }
    },
    [address, provider]
  );

  useEffect(() => {
    fetchBalance(fromToken).then(setFromBal);
  }, [fromToken, address, fetchBalance]);

  useEffect(() => {
    fetchBalance(toToken).then(setToBal);
  }, [toToken, address, fetchBalance]);

  // ── Auto-quote with debounce ───────────────────────────────────────────────

  const clearQuote = useCallback(() => {
    setQuoteOut(null);
    setUniRate(null);
    setPriceImpact(null);
    setQuoteError(null);
    setGasEst(null);
    setTxHash(null);
    setSwapError(null);
  }, []);

  const runQuote = useCallback(async (fromKey: TokenKey, toKey: TokenKey, amt: string) => {
    const parsed = parseFloat(amt);
    if (!parsed || parsed <= 0 || fromKey === toKey) { clearQuote(); return; }

    setQuoting(true);
    clearQuote();

    try {
      const rpc  = provider ?? new ethers.JsonRpcProvider("https://rpc.sepolia.org");
      const from = TOKENS[fromKey];
      const to   = TOKENS[toKey];
      const fee  = getFeeTier(fromKey, toKey);

      const quoter = new ethers.Contract(QUOTER_V2, QUOTER_V2_ABI, rpc);
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn:           from.address,
        tokenOut:          to.address,
        amountIn:          ethers.parseUnits(amt, from.decimals),
        fee,
        sqrtPriceLimitX96: BigInt(0),
      });

      const amountOut   = result[0] as bigint;
      const gasEstimate = result[3] as bigint;
      const formatted   = ethers.formatUnits(amountOut, to.decimals);
      const outNum      = parseFloat(formatted);

      setQuoteOut(fmtAmount(outNum, to.decimals));
      setGasEst(gasEstimate.toString());

      const rate = outNum / parsed;
      setUniRate(rate);

      const oracleRate = getOracleRate(fromKey, toKey, feedPrices);
      if (oracleRate && oracleRate > 0) {
        setPriceImpact(((oracleRate - rate) / oracleRate) * 100);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setQuoteError(
        msg.includes("revert") || msg.includes("CALL_EXCEPTION")
          ? "No liquidity pool found for this pair on Sepolia."
          : "Could not fetch quote."
      );
    } finally {
      setQuoting(false);
    }
  }, [provider, feedPrices, clearQuote]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runQuote(fromToken, toToken, amountIn);
    }, SWAP_QUOTE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fromToken, toToken, amountIn, runQuote]);

  // ── Flip ──────────────────────────────────────────────────────────────────

  function flipTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountIn("");
    clearQuote();
  }

  // ── Swap execution ────────────────────────────────────────────────────────

  async function executeSwap() {
    if (!signer || !address || !quoteOut || !amountIn) return;
    setSwapping(true);
    setSwapError(null);
    setTxHash(null);

    try {
      const from        = TOKENS[fromToken];
      const to          = TOKENS[toToken];
      const fee         = getFeeTier(fromToken, toToken);
      const amountInWei = ethers.parseUnits(amountIn, from.decimals);
      const minOutRaw   = parseFloat(quoteOut) * SWAP_SLIPPAGE_TOLERANCE;
      const amountOutMin = ethers.parseUnits(
        fmtAmount(minOutRaw, to.decimals),
        to.decimals
      );

      const erc20     = new ethers.Contract(from.address, ERC20_ABI, signer);
      const allowance = await erc20.allowance(address, SWAP_ROUTER2) as bigint;

      if (allowance < amountInWei) {
        setApproving(true);
        await (await erc20.approve(SWAP_ROUTER2, amountInWei)).wait();
        setApproving(false);
      }

      const router = new ethers.Contract(SWAP_ROUTER2, SWAP_ROUTER_ABI, signer);
      const tx = await router.exactInputSingle({
        tokenIn:           from.address,
        tokenOut:          to.address,
        fee,
        recipient:         address,
        amountIn:          amountInWei,
        amountOutMinimum:  amountOutMin,
        sqrtPriceLimitX96: BigInt(0),
      });

      setTxHash(tx.hash);
      await tx.wait();
      // Refresh balances after swap
      fetchBalance(fromToken).then(setFromBal);
      fetchBalance(toToken).then(setToBal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSwapError(
        msg.includes("user rejected") ? "Transaction rejected."
        : msg.includes("insufficient") ? "Insufficient balance."
        : "Swap failed. Check balance & allowance."
      );
    } finally {
      setApproving(false);
      setSwapping(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const fromUSDprice = tokenUSD(fromToken, feedPrices);
  const toUSDprice   = tokenUSD(toToken,   feedPrices);
  const oracleRate   = getOracleRate(fromToken, toToken, feedPrices);
  const feePct       = getFeeTier(fromToken, toToken) === UNISWAP_FEE_TIER_LOW ? "0.05%" : "0.3%";

  const fromUSD = fromUSDprice && amountIn
    ? fromUSDprice * parseFloat(amountIn) : null;
  const toUSD   = toUSDprice && quoteOut
    ? toUSDprice * parseFloat(quoteOut) : null;

  const impactColor =
    priceImpact === null          ? "text-muted-foreground"
    : Math.abs(priceImpact) > PRICE_IMPACT_HIGH_PCT   ? "text-red-400"
    : Math.abs(priceImpact) > PRICE_IMPACT_MEDIUM_PCT   ? "text-yellow-400"
    : "text-green-400";

  const spread = oracleRate && uniRate
    ? ((oracleRate - uniRate) / oracleRate) * 100 : null;

  // Button label & state
  const btnLabel = approving ? "Approving…"
    : swapping              ? "Swapping…"
    : !address              ? "Connect Wallet to Swap"
    : !amountIn             ? "Enter an amount"
    : fromToken === toToken  ? "Select different tokens"
    : quoting               ? "Fetching price…"
    : quoteError            ? "No route found"
    : !quoteOut             ? "Enter an amount"
    : "Swap";

  const btnDisabled = !address || !quoteOut || swapping || approving || fromToken === toToken || !!quoteError;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-base tracking-wide">Swap</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Trade tokens instantly via Uniswap V3</p>
          </div>
          <span className="text-xs text-muted-foreground/70 border border-border px-2 py-1 rounded-lg">
            Sepolia
          </span>
        </div>
      </div>

      <div className="p-5 space-y-1">

        {/* ── YOU PAY box ───────────────────────────────────────────────────── */}
        <div className="bg-background border border-border rounded-xl p-4 hover:border-muted-foreground/40 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <span className="text-muted-foreground text-xs font-medium">You pay</span>
            {address && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">
                  Balance: {fromBal !== null ? fromBal : "—"}
                </span>
                {fromBal && parseFloat(fromBal) > 0 && (
                  <button
                    onClick={() => setAmountIn(fromBal)}
                    className="text-violet-400 hover:text-violet-300 text-xs font-medium
                               bg-violet-900/20 border border-violet-700/30 rounded px-1.5 py-0.5
                               transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Amount input */}
            <input
              type="number"
              min="0"
              step="any"
              value={amountIn}
              onChange={e => setAmountIn(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-white text-3xl font-light outline-none
                         placeholder-muted-foreground/30 min-w-0
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                         [&::-webkit-inner-spin-button]:appearance-none"
            />

            {/* Token selector pill */}
            <div className="relative shrink-0">
              <select
                value={fromToken}
                onChange={e => {
                  const next = e.target.value as TokenKey;
                  if (next === toToken) setToToken(fromToken);
                  setFromToken(next);
                }}
                className={`appearance-none cursor-pointer border rounded-full px-3 py-1.5
                            text-sm font-semibold outline-none pr-7
                            ${TOKENS[fromToken].color}`}
              >
                {TOKEN_KEYS.map(k => (
                  <option key={k} value={k} className="bg-background text-white">{k}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
            </div>
          </div>

          {/* USD equivalent */}
          <p className="text-muted-foreground/70 text-xs mt-2">
            {fromUSD !== null ? fmtUSD(fromUSD) : fromUSDprice ? fmtUSD(0) : "—"}
          </p>
        </div>

        {/* ── Flip button ───────────────────────────────────────────────────── */}
        <div className="flex justify-center relative z-10 -my-1">
          <button
            onClick={flipTokens}
            className="bg-secondary hover:bg-accent border-2 border-background
                       rounded-full p-2.5 transition-all hover:scale-110 hover:rotate-180
                       duration-200 text-muted-foreground hover:text-white shadow-lg"
            aria-label="Flip tokens"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* ── YOU RECEIVE box ───────────────────────────────────────────────── */}
        <div className="bg-background border border-border rounded-xl p-4 hover:border-muted-foreground/40 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <span className="text-muted-foreground text-xs font-medium">You receive</span>
            {address && (
              <span className="text-muted-foreground text-xs">
                Balance: {toBal !== null ? toBal : "—"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quote output */}
            <div className="flex-1 min-w-0">
              {quoting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-muted-foreground text-lg">Fetching…</span>
                </div>
              ) : quoteOut ? (
                <span className="text-white text-3xl font-light">{quoteOut}</span>
              ) : (
                <span className="text-muted-foreground/40 text-3xl font-light">0</span>
              )}
            </div>

            {/* Token selector pill */}
            <div className="relative shrink-0">
              <select
                value={toToken}
                onChange={e => {
                  const next = e.target.value as TokenKey;
                  if (next === fromToken) setFromToken(toToken);
                  setToToken(next);
                }}
                className={`appearance-none cursor-pointer border rounded-full px-3 py-1.5
                            text-sm font-semibold outline-none pr-7
                            ${TOKENS[toToken].color}`}
              >
                {TOKEN_KEYS.map(k => (
                  <option key={k} value={k} className="bg-background text-white">{k}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
            </div>
          </div>

          {/* USD equivalent */}
          <p className="text-muted-foreground/70 text-xs mt-2">
            {toUSD !== null ? fmtUSD(toUSD) : "—"}
          </p>
        </div>

        {/* ── Transaction Overview ──────────────────────────────────────────── */}
        {(oracleRate || uniRate || quoteError) && (
          <div className="border border-border rounded-xl overflow-hidden">

            {/* Collapsible header */}
            <button
              onClick={() => setOverviewOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3
                         text-xs font-medium hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                {uniRate && oracleRate ? (
                  <>
                    <span className="text-muted-foreground">
                      1 {fromToken} ≈{" "}
                      <span className="text-white">
                        {fmtAmount(uniRate, TOKENS[toToken].decimals)} {toToken}
                      </span>
                    </span>
                    {priceImpact !== null && (
                      <span className={`${impactColor}`}>
                        ({priceImpact > 0 ? "-" : "+"}{Math.abs(priceImpact).toFixed(2)}%)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Transaction overview</span>
                )}
              </div>
              <span className="text-muted-foreground/70 text-sm">{overviewOpen ? "▴" : "▾"}</span>
            </button>

            {/* Expanded rows */}
            {overviewOpen && (
              <div className="border-t border-border divide-y divide-border/50 text-xs">

                {/* Oracle rate row */}
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    Chainlink oracle price
                  </span>
                  <span className="text-blue-400 font-mono">
                    {oracleRate
                      ? `1 ${fromToken} = ${fmtAmount(oracleRate, TOKENS[toToken].decimals)} ${toToken}`
                      : "—"}
                  </span>
                </div>

                {/* Uniswap rate row */}
                {uniRate && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Uniswap V3 price ({feePct} fee)
                    </span>
                    <span className="text-green-400 font-mono">
                      1 {fromToken} = {fmtAmount(uniRate, TOKENS[toToken].decimals)} {toToken}
                    </span>
                  </div>
                )}

                {/* Spread */}
                {spread !== null && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Oracle vs DEX spread</span>
                    <span className={Math.abs(spread) > 1 ? "text-red-400" : "text-muted-foreground"}>
                      {spread > 0
                        ? `Oracle +${spread.toFixed(3)}%`
                        : `DEX +${Math.abs(spread).toFixed(3)}%`}
                    </span>
                  </div>
                )}

                {/* Price impact */}
                {priceImpact !== null && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Price impact</span>
                    <span className={impactColor}>
                      {Math.abs(priceImpact) < PRICE_IMPACT_MIN_DISPLAY
                        ? "< 0.001%"
                        : `${Math.abs(priceImpact).toFixed(3)}%`}
                    </span>
                  </div>
                )}

                {/* Max slippage */}
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Max slippage</span>
                  <span className="text-muted-foreground">0.50%</span>
                </div>

                {/* Min received */}
                {quoteOut && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Min received</span>
                    <span className="text-foreground/80 font-mono">
                      {fmtAmount(parseFloat(quoteOut) * SWAP_SLIPPAGE_TOLERANCE, TOKENS[toToken].decimals)} {toToken}
                    </span>
                  </div>
                )}

                {/* Gas */}
                {gasEst && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Est. gas units</span>
                    <span className="text-muted-foreground">{parseInt(gasEst).toLocaleString()}</span>
                  </div>
                )}

                {/* Quote error */}
                {quoteError && (
                  <div className="px-4 py-2.5 text-red-400">⚠ {quoteError}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Status banners ────────────────────────────────────────────────── */}
        {approving && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-900/20
                          border border-yellow-700/30 rounded-xl px-4 py-3">
            <div className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0" />
            Approving {fromToken} spend… confirm in wallet
          </div>
        )}
        {swapError && (
          <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40
                          rounded-xl px-4 py-3">
            ⚠ {swapError}
          </div>
        )}
        {txHash && (
          <div className="flex items-center gap-2 text-green-400 text-xs bg-green-950/30
                          border border-green-800/40 rounded-xl px-4 py-3">
            <span>✓ Swap submitted</span>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-green-300 ml-1"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          </div>
        )}

        {/* ── Swap Button ───────────────────────────────────────────────────── */}
        <button
          onClick={executeSwap}
          disabled={btnDisabled}
          className="w-full py-3.5 rounded-xl font-semibold text-sm mt-2
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     enabled:hover:brightness-110 enabled:hover:shadow-lg
                     enabled:hover:shadow-violet-900/40
                     bg-gradient-to-r from-violet-600 to-purple-600
                     disabled:from-gray-700 disabled:to-gray-700
                     disabled:text-muted-foreground enabled:text-white"
        >
          {btnLabel}
        </button>

        {/* Footer */}
        <p className="text-center text-muted-foreground/40 text-xs pt-1">
          Powered by Uniswap V3 · Sepolia · {feePct} fee tier
        </p>

      </div>
    </div>
  );
}
