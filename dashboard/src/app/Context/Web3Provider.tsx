"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useToast } from "./ToastProvider";

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = async () => {
    if (!window.ethereum) {
      addToast("MetaMask not detected — install it to connect", "error");
      return;
    }
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const s = await browserProvider.getSigner();
      const addr = await s.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(s);
      setAddress(addr);
      setChainId(Number(network.chainId));
      addToast(`Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`, "success");
    } catch {
      addToast("Wallet connection rejected", "error");
    }
  };

  // Listen for chain/account changes from MetaMask
  useEffect(() => {
    if (!window.ethereum) return;

    function handleChainChanged(hexChainId: string) {
      const newChainId = parseInt(hexChainId, 16);
      setChainId(newChainId);
      // Re-create provider for new chain
      const browserProvider = new ethers.BrowserProvider(window.ethereum!);
      setProvider(browserProvider);
      browserProvider.getSigner().then(s => {
        setSigner(s);
        addToast(`Switched to chain ${newChainId}`, "info");
      }).catch(() => {
        setSigner(null);
      });
    }

    function handleAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) {
        setAddress(null);
        setSigner(null);
        addToast("Wallet disconnected", "info");
      } else {
        setAddress(accounts[0]);
        const browserProvider = new ethers.BrowserProvider(window.ethereum!);
        setProvider(browserProvider);
        browserProvider.getSigner().then(s => setSigner(s)).catch(() => setSigner(null));
        addToast(`Account: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, "info");
      }
    }

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum!.removeListener("chainChanged", handleChainChanged);
      window.ethereum!.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [addToast]);

  return (
    <Web3Context.Provider value={{ provider, signer, address, chainId, connect }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used inside Web3Provider");
  }
  return context;
}
