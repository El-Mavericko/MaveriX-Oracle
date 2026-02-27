"use client";

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
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mt-6">
        <h2 className="text-gray-400 text-sm mb-2">Oracle Health</h2>
        <p className="text-gray-500 text-sm">Waiting for price data...</p>
      </div>
    );
  }

  const deviation = ((oracle - marketPrice) / marketPrice) * 100;
  const absDev = Math.abs(deviation);

  // Simple health model (tweak as you like)
  const healthScore = Math.max(0, 100 - Math.min(100, absDev * 10));

  const status =
    healthScore >= 80 ? "Healthy" : healthScore >= 55 ? "Warning" : "Critical";

  const statusColor =
    healthScore >= 80
      ? "text-green-400"
      : healthScore >= 55
      ? "text-yellow-400"
      : "text-red-400";

  const barColor =
    healthScore >= 80
      ? "bg-green-500"
      : healthScore >= 55
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-gray-400 text-sm">Oracle Health</h2>

        {lastUpdated && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
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
          <p className="text-gray-500">Oracle Price</p>
          <p className="text-white font-semibold">${oracle.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-gray-500">Market Price</p>
          <p className="text-white font-semibold">${marketPrice.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-gray-500">Deviation</p>
          <p
            className={`font-semibold ${
              deviation >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {deviation.toFixed(3)}%
          </p>
        </div>

        <div>
          <p className="text-gray-500">Health Score</p>
          <p className={`font-semibold ${statusColor}`}>
            {healthScore.toFixed(0)} / 100 ({status})
          </p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mt-6 w-full bg-[#0d1117] h-2 rounded">
        <div
          className={`h-2 rounded ${barColor}`}
          style={{ width: `${healthScore}%` }}
        />
      </div>
    </div>
  );
}