"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []);

    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setSigner(signer);
    setAddress(address);
    setChainId(Number(network.chainId));
  };

  return (
    <Web3Context.Provider
      value={{ provider, signer, address, chainId, connect }}
    >
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
