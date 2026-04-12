
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ORACLE_POLL_INTERVAL_MS, CHAIN_MAINNET, CHAIN_SEPOLIA, CHAIN_LOCALHOST } from "@/src/app/constants";

interface BlockInfo {
  number: number;
  baseFeeGwei: string;
  timestamp: Date;
  network: string;
}

function networkName(chainId: bigint): string {
  const id = Number(chainId);
  if (id === CHAIN_MAINNET) return "Mainnet";
  if (id === CHAIN_SEPOLIA) return "Sepolia";
  if (id === CHAIN_LOCALHOST) return "Localhost";
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
    const interval = setInterval(fetchBlock, ORACLE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-border px-6 py-4 rounded mb-6">
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Network</p>
      {!block ? (
        <p className="text-muted-foreground/70 text-sm">Connect wallet to see network info...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Chain</p>
            <p className="text-white font-mono">{block.network}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Block</p>
            <p className="text-white font-mono">#{block.number.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Base Fee</p>
            <p className="text-white font-mono">{block.baseFeeGwei} gwei</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Last Block</p>
            <p className="text-white font-mono">{block.timestamp.toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
