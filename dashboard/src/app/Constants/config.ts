// Poll intervals
export const ORACLE_POLL_INTERVAL_MS      = 15_000;
export const MARKET_POLL_INTERVAL_MS      = 60_000;
export const YIELD_POLL_INTERVAL_MS       = 5 * 60 * 1000;

// Data caps
export const EVENT_LOG_MAX_ENTRIES        = 20;
export const DEVIATION_HISTORY_MAX        = 50;
export const YIELD_MAX_POOLS_DISPLAY      = 12;

// Filters
export const YIELD_MIN_TVL_USD            = 100_000;

// Swap
export const SWAP_SLIPPAGE_TOLERANCE      = 0.995; // 0.5% max slippage
export const SWAP_QUOTE_DEBOUNCE_MS       = 600;
export const UNISWAP_FEE_TIER_LOW         = 500;   // 0.05% — stable pairs
export const UNISWAP_FEE_TIER_MEDIUM      = 3000;  // 0.30% — standard pairs

// Price impact thresholds (%)
export const PRICE_IMPACT_HIGH_PCT        = 3;
export const PRICE_IMPACT_MEDIUM_PCT      = 1;
export const PRICE_IMPACT_MIN_DISPLAY     = 0.001;

// Lending — health factor
export const HF_SAFE                      = 2.0;
export const HF_MODERATE                  = 1.25;
export const HF_AT_RISK                   = 1.0;  // liquidation boundary
export const HF_MAX_DISPLAY               = 3.0;  // upper end of the progress bar

// Oracle health score (0–100)
export const HEALTH_SCORE_HEALTHY         = 80;
export const HEALTH_SCORE_WARNING         = 55;
export const HEALTH_DEVIATION_MULTIPLIER  = 10;  // score = 100 - |deviation| * multiplier

// Feed deviation display threshold (%)
export const DEVIATION_HEALTHY_PCT        = 0.5;

// Yield APY colour thresholds (%)
export const APY_HIGH_PCT                 = 10;
export const APY_MEDIUM_PCT               = 4;
export const APY_LOW_PCT                  = 1;
export const APY_MAX_DISPLAY              = 100;  // above this shows ">100%"

// Yield DeFi Llama cache
export const YIELD_CACHE_SECONDS          = 300;  // 5 min SSR revalidation

// UI feedback
export const COPY_FEEDBACK_MS             = 1500;

// Chain IDs
export const CHAIN_MAINNET                = 1;
export const CHAIN_SEPOLIA                = 11155111;
export const CHAIN_LOCALHOST              = 31337;
