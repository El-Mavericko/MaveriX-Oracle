"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ORACLE_ABI } from "@/src/app/Constants";

interface Round {
  roundId: string;
  price: string;
  updatedAt: Date;
}

const PAGE_SIZE = 10;

interface Props {
  latestRoundId: bigint | null;
  oracleAddress: string;
}

export default function RoundExplorer({ latestRoundId, oracleAddress }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  async function fetchRounds() {
    if (!latestRoundId || !window.ethereum) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);

      const startId = latestRoundId - BigInt(page * PAGE_SIZE);
      const ids = Array.from({ length: PAGE_SIZE }, (_, i) => startId - BigInt(i)).filter(
        id => id > BigInt(0)
      );

      const results = await Promise.allSettled(
        ids.map(async id => {
          const data = await contract.getRoundData(id);
          return {
            roundId: id.toString(),
            price: `$${(Number(data[1]) / 1e8).toFixed(2)}`,
            updatedAt: new Date(Number(data[3]) * 1000),
          };
        })
      );

      setRounds(
        results
          .filter((r): r is PromiseFulfilledResult<Round> => r.status === "fulfilled")
          .map(r => r.value)
      );
    } catch (err) {
      console.error("Round fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
  }, [oracleAddress]);

  useEffect(() => {
    fetchRounds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRoundId, page, oracleAddress]);

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-400 text-sm">Round History — ETH / USD</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="text-xs px-3 py-1 bg-[#21262d] hover:bg-[#30363d] rounded disabled:opacity-40"
          >
            ← Older
          </button>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={loading || page === 0}
            className="text-xs px-3 py-1 bg-[#21262d] hover:bg-[#30363d] rounded disabled:opacity-40"
          >
            Newer →
          </button>
        </div>
      </div>

      {!latestRoundId ? (
        <p className="text-gray-500 text-sm">Connect wallet to explore oracle rounds...</p>
      ) : loading ? (
        <p className="text-gray-500 text-sm">Loading rounds...</p>
      ) : (
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-[#21262d]">
              <th className="text-left pb-2 font-normal">Round</th>
              <th className="text-left pb-2 font-normal">Price</th>
              <th className="text-left pb-2 font-normal">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map(round => (
              <tr
                key={round.roundId}
                className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors"
              >
                <td className="py-2 text-blue-400">{round.roundId}</td>
                <td className="py-2 text-green-400">{round.price}</td>
                <td className="py-2 text-gray-400">{round.updatedAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
