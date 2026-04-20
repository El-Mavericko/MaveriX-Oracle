"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useToast } from "./ToastProvider";

// EIP-6963: wallet announcement types
interface EIP6963ProviderInfo {
  uuid:  string;
  name:  string;
  icon:  string;
  rdns:  string;
}
interface EIP6963ProviderDetail {
  info:     EIP6963ProviderInfo;
  provider: EIP1193Provider;
}
interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on:      (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface Web3ContextType {
  provider:    ethers.BrowserProvider | null;
  signer:      ethers.JsonRpcSigner | null;
  address:     string | null;
  chainId:     number | null;
  walletName:  string | null;
  wallets:     EIP6963ProviderDetail[];
  connect:     () => void;
  connectWith: (wallet: EIP6963ProviderDetail) => Promise<void>;
  disconnect:  () => void;
  pickerOpen:  boolean;
  setPickerOpen: (open: boolean) => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const [provider,    setProvider]    = useState<ethers.BrowserProvider | null>(null);
  const [signer,      setSigner]      = useState<ethers.JsonRpcSigner | null>(null);
  const [address,     setAddress]     = useState<string | null>(null);
  const [chainId,     setChainId]     = useState<number | null>(null);
  const [walletName,  setWalletName]  = useState<string | null>(null);
  const [wallets,     setWallets]     = useState<EIP6963ProviderDetail[]>([]);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [activeEIP,   setActiveEIP]   = useState<EIP1193Provider | null>(null);

  // Discover wallets via EIP-6963
  useEffect(() => {
    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      setWallets(prev => {
        if (prev.some(w => w.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  // Fallback: add window.ethereum if no EIP-6963 wallets announced after 200ms
  useEffect(() => {
    const t = setTimeout(() => {
      if (wallets.length === 0 && window.ethereum) {
        const name =
          (window.ethereum as { isRabby?: boolean }).isRabby         ? "Rabby"         :
          (window.ethereum as { isBraveWallet?: boolean }).isBraveWallet    ? "Brave Wallet"  :
          (window.ethereum as { isCoinbaseWallet?: boolean }).isCoinbaseWallet ? "Coinbase Wallet" :
          "MetaMask";
        setWallets([{
          info: { uuid: "injected", name, icon: "", rdns: "injected" },
          provider: window.ethereum as unknown as EIP1193Provider,
        }]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [wallets]);

  const connectWith = useCallback(async (wallet: EIP6963ProviderDetail) => {
    setPickerOpen(false);
    try {
      const browserProvider = new ethers.BrowserProvider(wallet.provider as never);
      await browserProvider.send("eth_requestAccounts", []);

      const s       = await browserProvider.getSigner();
      const addr    = await s.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(s);
      setAddress(addr);
      setChainId(Number(network.chainId));
      setWalletName(wallet.info.name);
      setActiveEIP(wallet.provider);
      addToast(`Connected via ${wallet.info.name}: ${addr.slice(0, 6)}…${addr.slice(-4)}`, "success");
    } catch {
      addToast("Wallet connection rejected", "error");
    }
  }, [addToast]);

  const connect = useCallback(() => {
    if (wallets.length === 0) {
      addToast("No wallet detected — install MetaMask or another EIP-1193 wallet", "error");
      return;
    }
    if (wallets.length === 1) {
      connectWith(wallets[0]);
    } else {
      setPickerOpen(true);
    }
  }, [wallets, connectWith, addToast]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setWalletName(null);
    setActiveEIP(null);
    addToast("Wallet disconnected", "info");
  }, [addToast]);

  // Chain / account change listeners
  useEffect(() => {
    if (!activeEIP) return;

    function handleChainChanged(hexChainId: unknown) {
      const newChainId = parseInt(hexChainId as string, 16);
      setChainId(newChainId);
      const bp = new ethers.BrowserProvider(activeEIP as never);
      setProvider(bp);
      bp.getSigner().then(s => {
        setSigner(s);
        addToast(`Switched to chain ${newChainId}`, "info");
      }).catch(() => setSigner(null));
    }

    function handleAccountsChanged(accounts: unknown) {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else {
        setAddress(accs[0]);
        const bp = new ethers.BrowserProvider(activeEIP as never);
        setProvider(bp);
        bp.getSigner().then(s => setSigner(s)).catch(() => setSigner(null));
        addToast(`Account: ${accs[0].slice(0, 6)}…${accs[0].slice(-4)}`, "info");
      }
    }

    activeEIP.on("chainChanged",    handleChainChanged);
    activeEIP.on("accountsChanged", handleAccountsChanged);
    return () => {
      activeEIP.removeListener("chainChanged",    handleChainChanged);
      activeEIP.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [activeEIP, addToast, disconnect]);

  return (
    <Web3Context.Provider value={{
      provider, signer, address, chainId, walletName,
      wallets, connect, connectWith, disconnect,
      pickerOpen, setPickerOpen,
    }}>
      {children}
      {pickerOpen && (
        <WalletPickerModal
          wallets={wallets}
          onSelect={connectWith}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Web3Context.Provider>
  );
}

function WalletPickerModal({
  wallets, onSelect, onClose,
}: {
  wallets:  EIP6963ProviderDetail[];
  onSelect: (w: EIP6963ProviderDetail) => void;
  onClose:  () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-80 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-sm font-semibold uppercase tracking-widest">Connect Wallet</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="space-y-2">
          {wallets.map(w => (
            <button
              key={w.info.uuid}
              onClick={() => onSelect(w)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded border border-border hover:border-blue-500 hover:bg-blue-500/10 transition-colors text-left"
            >
              {w.info.icon
                ? <img src={w.info.icon} alt={w.info.name} className="w-6 h-6 rounded" />
                : <div className="w-6 h-6 rounded bg-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">?</div>
              }
              <span className="text-white text-sm">{w.info.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50 mt-4 text-center">
          Only wallets installed in this browser are shown
        </p>
      </div>
    </div>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used inside Web3Provider");
  return context;
}
