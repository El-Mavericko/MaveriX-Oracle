
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DeviationPoint } from "@/src/app/types";

interface Props {
  history: DeviationPoint[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  color: "#fff",
  fontSize: 12,
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const eth = payload.find((p: any) => p.dataKey === "deviation");
  const btc = payload.find((p: any) => p.dataKey === "btcDeviation");
  return (
    <div style={TOOLTIP_STYLE} className="rounded px-3 py-2">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {eth && (
        <p style={{ color: eth.color }} className="text-xs">
          ETH: {eth.value >= 0 ? "+" : ""}{eth.value?.toFixed(4)}%
          {Math.abs(eth.value) >= 1 && <span className="ml-1 text-red-400">⚠ liquidation risk</span>}
        </p>
      )}
      {btc && btc.value !== null && btc.value !== undefined && (
        <p style={{ color: btc.color }} className="text-xs">
          BTC: {btc.value >= 0 ? "+" : ""}{btc.value?.toFixed(4)}%
          {Math.abs(btc.value) >= 1 && <span className="ml-1 text-red-400">⚠ liquidation risk</span>}
        </p>
      )}
    </div>
  );
}

export default function DeviationChart({ history }: Props) {
  const hasBtc = history.some(p => p.btcDeviation !== undefined);

  return (
    <div className="bg-card border border-border p-6 rounded mb-6">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-muted-foreground text-sm">Oracle Deviation — ETH vs BTC</h2>
        <div className="flex gap-4 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> ETH
          </span>
          {hasBtc && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> BTC
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mb-4">
        Oracle price vs CoinGecko market price · &gt;1% deviation can trigger DeFi liquidations
      </p>

      {history.length < 2 ? (
        <p className="text-muted-foreground text-sm">Collecting data points — updates every 60s…</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <YAxis
              yAxisId="dev"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              unit="%"
              width={52}
              domain={["auto", "auto"]}
            />

            {/* Zero line */}
            <ReferenceLine yAxisId="dev" y={0}    stroke="#374151" strokeDasharray="4 2" />
            {/* 0.5% warning band */}
            <ReferenceLine yAxisId="dev" y={0.5}  stroke="#d97706" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: "0.5%", fill: "#d97706", fontSize: 9, position: "insideTopRight" }} />
            <ReferenceLine yAxisId="dev" y={-0.5} stroke="#d97706" strokeDasharray="3 3" strokeOpacity={0.4} />
            {/* 1% liquidation risk line */}
            <ReferenceLine yAxisId="dev" y={1}    stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "1% risk", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
            <ReferenceLine yAxisId="dev" y={-1}   stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />

            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />

            <Line
              yAxisId="dev"
              type="monotone"
              dataKey="deviation"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="ETH deviation %"
            />
            {hasBtc && (
              <Line
                yAxisId="dev"
                type="monotone"
                dataKey="btcDeviation"
                stroke="#60a5fa"
                dot={false}
                strokeWidth={2}
                name="BTC deviation %"
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
