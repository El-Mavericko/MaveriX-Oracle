
import { motion } from "framer-motion";
import { DEVIATION_HEALTHY_PCT } from "@/src/app/constants";
import type { FeedConfig, FeedPrice } from "@/src/app/types";

interface Props {
  feeds: FeedConfig[];
  feedPrices: Record<string, FeedPrice>;
  marketPrices: Record<string, number>;
}

export default function MultiFeedGrid({ feeds, feedPrices, marketPrices }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {feeds.map((feed, i) => {
        const fp = feedPrices[feed.id];
        const mp = marketPrices[feed.coinGeckoId];
        const deviation = fp && mp ? ((fp.price - mp) / mp) * 100 : null;

        return (
          <motion.div
            key={feed.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="bg-card border border-border p-4 rounded"
          >
            <p className="text-xs text-muted-foreground mb-1">{feed.label}</p>
            <p className="text-2xl font-bold text-white">
              {fp
                ? `$${fp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Loading..."}
            </p>
            {deviation !== null && (
              <p
                className={`text-xs mt-1 ${
                  Math.abs(deviation) < DEVIATION_HEALTHY_PCT ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {deviation >= 0 ? "+" : ""}
                {deviation.toFixed(3)}% vs market
              </p>
            )}
            {fp && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Updated {fp.updatedAt.toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
