"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";

export default function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState("7");

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Fetch data when timeframe changes
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/ethereum/ohlc?vs_currency=usd&days=${timeframe}`
      );

      const raw = await res.json();

      const formatted = raw.map((item: any) => ({
        time: item[0] / 1000,
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }));

      seriesRef.current?.setData(formatted);
    }

    fetchData();
  }, [timeframe]);

  const timeframes = [
    { label: "1D", value: "1" },
    { label: "7D", value: "7" },
    { label: "30D", value: "30" },
    { label: "90D", value: "90" },
  ];

 return (
  <div className="w-full">
    {/* Timeframe Switcher */}
    <div className="flex gap-2 mb-4">
      {timeframes.map(tf => (
        <button
          key={tf.value}
          onClick={() => setTimeframe(tf.value)}
          className={`px-3 py-1 text-sm rounded transition ${
            timeframe === tf.value
              ? "bg-blue-600 text-white"
              : "bg-[#1e293b] text-gray-400 hover:bg-[#334155]"
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>

    {/* Chart Container */}
    <div
      ref={chartContainerRef}
      className="w-full"
      style={{ height: "460px" }}
    />
  </div>
);
}