
import { motion } from "framer-motion";
import { DEVIATION_HEALTHY_PCT } from "@/src/app/constants";
import type { FeedConfig, FeedPrice } from "@/src/app/types";

interface Props {
  feeds: FeedConfig[];
  feedPrices: Record<string, FeedPrice>;
  marketPrices: Record<string, number>;
}

function formatAge(seconds: number): string {
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function HeartbeatBar({ secondsSince, heartbeat }: { secondsSince: number; heartbeat: number }) {
  const pct   = Math.min((secondsSince / heartbeat) * 100, 100);
  const color = pct > 90 ? "bg-yellow-400" : pct > 60 ? "bg-blue-400" : "bg-green-400";
  return (
    <div className="w-full bg-border rounded-full h-1 mt-2">
      <div className={`${color} h-1 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function LoadingSkeleton({ feed }: { feed: FeedConfig }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{feed.label}</span>
        <span className="text-xs text-muted-foreground/40 font-mono">Fetching oracle data…</span>
      </div>
      <div className="text-3xl">💀</div>
      <div className="h-3 w-24 bg-border rounded" />
      <div className="flex justify-between text-xs text-muted-foreground/40 mt-1">
        <span>Heartbeat {feed.heartbeatSeconds / 60}m</span>
        <span>{feed.deviationThreshold}% deviation trigger</span>
      </div>
      <div className="w-full bg-border rounded-full h-1">
        <div className="bg-muted-foreground/20 h-1 rounded-full w-1/3" />
      </div>
    </div>
  );
}

export default function MultiFeedGrid({ feeds, feedPrices, marketPrices }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {feeds.map((feed, i) => {
        const fp        = feedPrices[feed.id];
        const mp        = marketPrices[feed.coinGeckoId];
        const deviation = fp && mp ? ((fp.price - mp) / mp) * 100 : null;

        const triggerColor =
          fp?.trigger === "heartbeat" ? "text-yellow-400" :
          fp?.trigger === "deviation" ? "text-green-400"  :
          "text-muted-foreground/50";

        const triggerLabel =
          fp?.trigger === "heartbeat" ? "⏱ Heartbeat update" :
          fp?.trigger === "deviation" ? "⚡ Deviation trigger" :
          "· Pending";

        return (
          <motion.div
            key={feed.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="bg-card border border-border p-4 rounded"
          >
            {!fp ? (
              <LoadingSkeleton feed={feed} />
            ) : (
              <>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs text-muted-foreground">{feed.label}</p>
                  <span className={`text-xs font-mono ${triggerColor}`}>{triggerLabel}</span>
                </div>

                <p className="text-2xl font-bold text-white">
                  ${fp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                {deviation !== null && (
                  <p className={`text-xs mt-1 ${Math.abs(deviation) < DEVIATION_HEALTHY_PCT ? "text-green-400" : "text-yellow-400"}`}>
                    {deviation >= 0 ? "+" : ""}{deviation.toFixed(3)}% vs market
                  </p>
                )}

                <div className="flex justify-between text-xs text-muted-foreground/60 mt-2">
                  <span>Updated {formatAge(fp.secondsSinceUpdate)}</span>
                  <span>{feed.heartbeatSeconds / 60}m heartbeat · {feed.deviationThreshold}% trigger</span>
                </div>
                <HeartbeatBar secondsSince={fp.secondsSinceUpdate} heartbeat={feed.heartbeatSeconds} />
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
