"use client";

import { useState } from "react";
import type { PriceAlert } from "@/src/app/types";

interface Props {
  alerts: PriceAlert[];
  onAdd: (threshold: number, direction: "above" | "below") => void;
  onRemove: (id: string) => void;
}

export default function PriceAlerts({ alerts, onAdd, onRemove }: Props) {
  const [threshold, setThreshold] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  function handleAdd() {
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) return;
    onAdd(val, direction);
    setThreshold("");
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded">
      <h2 className="text-gray-400 text-sm mb-4">Price Alerts — ETH / USD</h2>

      <div className="flex gap-2 mb-4">
        <select
          value={direction}
          onChange={e => setDirection(e.target.value as "above" | "below")}
          className="bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm px-2 py-1.5 rounded"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          type="number"
          placeholder="Price (USD)"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="flex-1 bg-[#0d1117] border border-[#30363d] text-white text-sm px-3 py-1.5 rounded"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded"
        >
          Add
        </button>
      </div>

      {alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">No alerts set.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map(alert => (
            <li
              key={alert.id}
              className={`flex justify-between items-center text-sm px-3 py-2 rounded border ${
                alert.triggered
                  ? "border-green-800 bg-green-900/10 text-green-400"
                  : "border-[#30363d] text-gray-300"
              }`}
            >
              <span>
                {alert.triggered ? "✓ " : ""}
                ETH {alert.direction} ${alert.threshold.toLocaleString()}
              </span>
              <button
                onClick={() => onRemove(alert.id)}
                className="text-gray-600 hover:text-red-400 ml-4 text-xl leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
