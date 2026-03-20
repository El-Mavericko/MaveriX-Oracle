"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/src/app/Context";
import { NETWORK_CONFIGS } from "@/src/app/Constants";

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
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const networkLabel = chainId && NETWORK_CONFIGS[chainId]
    ? NETWORK_CONFIGS[chainId].label
    : chainId
    ? `Chain ${chainId}`
    : null;

  if (!address) return null;

  return (
    <div className="bg-[#161b22] border border-[#30363d] px-6 py-4 rounded mb-6">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Wallet</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Address</p>
          <button
            onClick={copyAddress}
            className="text-white font-mono hover:text-blue-400 transition-colors text-left"
            title={address}
          >
            {address.slice(0, 6)}...{address.slice(-4)}{" "}
            <span className="text-gray-500 text-xs">{copied ? "✓ copied" : "copy"}</span>
          </button>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Balance</p>
          <p className="text-white font-mono">
            {balance !== null ? `${balance} ETH` : "—"}
          </p>
        </div>
        {networkLabel && (
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Network</p>
            <p className="text-white font-mono">{networkLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
