
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/src/app/context";
import { COPY_FEEDBACK_MS } from "@/src/app/constants";
import { NETWORK_CONFIGS } from "@/src/app/constants";

export default function WalletPanel() {
  const { provider, address, chainId } = useWeb3();
  const [balance, setBalance] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!provider || !address) {
      setBalance(null);
      return;
    }
    provider.getBalance(address).then(raw => {
      setBalance(parseFloat(ethers.formatEther(raw)).toFixed(4));
    }).catch(() => setBalance(null));
  }, [provider, address, chainId]);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  }

  const networkLabel = chainId && NETWORK_CONFIGS[chainId]
    ? NETWORK_CONFIGS[chainId].label
    : chainId
    ? `Chain ${chainId}`
    : null;

  if (!address) return null;

  return (
    <div className="bg-card border border-border px-6 py-4 rounded mb-6">
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Wallet</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Address</p>
          <button
            onClick={copyAddress}
            className="text-white font-mono hover:text-blue-400 transition-colors text-left"
            title={address}
          >
            {address.slice(0, 6)}...{address.slice(-4)}{" "}
            <span className="text-muted-foreground text-xs">{copied ? "✓ copied" : "copy"}</span>
          </button>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Balance</p>
          <p className="text-white font-mono">
            {balance !== null ? `${balance} ETH` : "—"}
          </p>
        </div>
        {networkLabel && (
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Network</p>
            <p className="text-white font-mono">{networkLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
