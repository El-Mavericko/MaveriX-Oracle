"use client";

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

export default function DeviationChart({ history }: Props) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6">
      <h2 className="text-gray-400 text-sm mb-4">Oracle Deviation History</h2>
      {history.length < 2 ? (
        <p className="text-gray-500 text-sm">
          Collecting data points — updates every 60s...
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <YAxis
              yAxisId="deviation"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              unit="%"
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                color: "#fff",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            <ReferenceLine
              yAxisId="deviation"
              y={0}
              stroke="#374151"
              strokeDasharray="4 2"
            />
            <Line
              yAxisId="deviation"
              type="monotone"
              dataKey="deviation"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="Deviation %"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
