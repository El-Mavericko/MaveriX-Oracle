
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";

// Binance klines config per timeframe — free, no API key required
const TIMEFRAME_CONFIG: Record<string, { interval: string; limit: number }> = {
  "1":  { interval: "1h",  limit: 24  }, // 1D  — 24 x 1h candles
  "7":  { interval: "4h",  limit: 42  }, // 7D  — 42 x 4h candles
  "30": { interval: "1d",  limit: 30  }, // 30D — 30 x 1d candles
  "90": { interval: "1d",  limit: 90  }, // 90D — 90 x 1d candles
};

export default function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState("7");
  const [error, setError] = useState(false);

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
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e293b" },
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

  // Fetch OHLC from Binance when timeframe changes
  useEffect(() => {
    async function fetchData() {
      setError(false);
      try {
        const { interval, limit } = TIMEFRAME_CONFIG[timeframe];
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=${interval}&limit=${limit}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        const formatted = raw.map((item: any) => ({
          time: item[0] / 1000,          // ms → seconds
          open:  parseFloat(item[1]),
          high:  parseFloat(item[2]),
          low:   parseFloat(item[3]),
          close: parseFloat(item[4]),
        }));

        seriesRef.current?.setData(formatted);
      } catch (err) {
        console.error("Chart fetch error:", err);
        setError(true);
      }
    }

    fetchData();
  }, [timeframe]);

  const timeframes = [
    { label: "1D", value: "1"  },
    { label: "7D", value: "7"  },
    { label: "30D", value: "30" },
    { label: "90D", value: "90" },
  ];

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        {timeframes.map(tf => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-3 py-1 text-sm rounded transition ${
              timeframe === tf.value
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-center justify-center h-[460px] text-muted-foreground text-sm">
          Chart data unavailable — check your connection
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full" style={{ height: "460px" }} />
      )}
    </div>
  );
}
