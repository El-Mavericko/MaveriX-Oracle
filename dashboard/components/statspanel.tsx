"use client";

import { useEffect, useState } from "react";

interface Stats {
  high24h: number;
  low24h: number;
  volume: number;
  change7d: number;
  marketCap: number;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
      );

      const data = await res.json();

      setStats({
        high24h: data.market_data.high_24h.usd,
        low24h: data.market_data.low_24h.usd,
        volume: data.market_data.total_volume.usd,
        change7d: data.market_data.price_change_percentage_7d,
        marketCap: data.market_data.market_cap.usd,
      });
    }

    fetchStats();
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 bg-zinc-900 p-6 rounded-xl mt-6">
      <Stat label="24H High" value={`$${stats.high24h.toLocaleString()}`} />
      <Stat label="24H Low" value={`$${stats.low24h.toLocaleString()}`} />
      <Stat label="24H Volume" value={`$${stats.volume.toLocaleString()}`} />
      <Stat
        label="7D Change"
        value={`${stats.change7d.toFixed(2)}%`}
        positive={stats.change7d >= 0}
      />
      <Stat label="Market Cap" value={`$${stats.marketCap.toLocaleString()}`} />
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p
        className={`text-lg font-semibold ${
          positive === undefined
            ? "text-white"
            : positive
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}