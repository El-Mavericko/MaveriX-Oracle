"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

interface BlockInfo {
  number: number;
  baseFeeGwei: string;
  timestamp: Date;
  network: string;
}

function networkName(chainId: bigint): string {
  const id = Number(chainId);
  if (id === 1) return "Mainnet";
  if (id === 11155111) return "Sepolia";
  if (id === 31337) return "Localhost";
  return `Chain ${id}`;
}

export default function NetworkMonitor() {
  const [block, setBlock] = useState<BlockInfo | null>(null);

  async function fetchBlock() {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [blockNumber, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
      ]);
      const latest = await provider.getBlock(blockNumber);
      if (!latest) return;

      const baseFeeGwei = latest.baseFeePerGas
        ? parseFloat(ethers.formatUnits(latest.baseFeePerGas, "gwei")).toFixed(2)
        : "—";

      setBlock({
        number: blockNumber,
        baseFeeGwei,
        timestamp: new Date(Number(latest.timestamp) * 1000),
        network: networkName(network.chainId),
      });
    } catch {
      // Silently skip if wallet not connected yet
    }
  }

  useEffect(() => {
    fetchBlock();
    const interval = setInterval(fetchBlock, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#161b22] border border-[#30363d] px-6 py-4 rounded mb-6">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Network</p>
      {!block ? (
        <p className="text-gray-600 text-sm">Connect wallet to see network info...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Chain</p>
            <p className="text-white font-mono">{block.network}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Block</p>
            <p className="text-white font-mono">#{block.number.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Base Fee</p>
            <p className="text-white font-mono">{block.baseFeeGwei} gwei</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Last Block</p>
            <p className="text-white font-mono">{block.timestamp.toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
