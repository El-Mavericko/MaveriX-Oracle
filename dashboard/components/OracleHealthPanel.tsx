
import { HEALTH_SCORE_HEALTHY, HEALTH_SCORE_WARNING, HEALTH_DEVIATION_MULTIPLIER } from "@/src/app/constants";

type OracleHealthProps = {
  oraclePrice: string;
  marketPrice: number | null;
  lastUpdated: Date | null;
};

export default function OracleHealthPanel({ oraclePrice, marketPrice, lastUpdated }: OracleHealthProps) {
  const oracle = parseFloat(oraclePrice);

  // If we don't have both prices yet, show a clean loading panel
  if (!marketPrice || Number.isNaN(oracle)) {
    return (
      <div className="bg-card border border-border p-6 rounded-lg">
        <h2 className="text-muted-foreground text-xs uppercase tracking-widest mb-2">Oracle Health</h2>
        <p className="text-muted-foreground text-sm">Waiting for price data...</p>
      </div>
    );
  }

  const deviation = ((oracle - marketPrice) / marketPrice) * 100;
  const absDev = Math.abs(deviation);

  // Simple health model (tweak as you like)
  const healthScore = Math.max(0, 100 - Math.min(100, absDev * HEALTH_DEVIATION_MULTIPLIER));

  const status =
    healthScore >= HEALTH_SCORE_HEALTHY ? "Healthy" : healthScore >= HEALTH_SCORE_WARNING ? "Warning" : "Critical";

  const statusColor =
    healthScore >= HEALTH_SCORE_HEALTHY
      ? "text-green-400"
      : healthScore >= HEALTH_SCORE_WARNING
      ? "text-yellow-400"
      : "text-red-400";

  const barColor =
    healthScore >= HEALTH_SCORE_HEALTHY
      ? "bg-green-500"
      : healthScore >= HEALTH_SCORE_WARNING
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="bg-card border border-border p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-muted-foreground text-xs uppercase tracking-widest">Oracle Health</h2>

        {lastUpdated && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>
              Last updated:{" "}
              {new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }).format(lastUpdated)}
            </span>
          </div>
        )}
      </div>

      

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">Oracle Price</p>
          <p className="text-white font-semibold">${oracle.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Market Price</p>
          <p className="text-white font-semibold">${marketPrice.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Deviation</p>
          <p
            className={`font-semibold ${
              deviation >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {deviation.toFixed(3)}%
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">Health Score</p>
          <p className={`font-semibold ${statusColor}`}>
            {healthScore.toFixed(0)} / 100 ({status})
          </p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mt-6 w-full bg-background h-2 rounded">
        <div
          className={`h-2 rounded ${barColor}`}
          style={{ width: `${healthScore}%` }}
        />
      </div>
    </div>
  );
}