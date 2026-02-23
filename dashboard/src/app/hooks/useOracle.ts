import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ORACLE_ADDRESS, ORACLE_ABI } from "../Constants/oracle";

export function useOracle() {
  const [price, setPrice] = useState<string>("Loading...");
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  /* -----------------------------
     CONNECT WALLET
  ------------------------------ */
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  /* -----------------------------
     FETCH ORACLE PRICE
  ------------------------------ */
  async function fetchOraclePrice() {
    try {
      if (!window.ethereum) {
        setPrice("No wallet detected");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        ORACLE_ADDRESS,
        ORACLE_ABI,
        provider
      );

      const data = await contract.latestRoundData();
      const formatted = Number(data[1]) / 1e8;

      setPrice(formatted.toString());
    } catch (err) {
      console.error("Oracle fetch error:", err);
      setPrice("Error");
    }
  }

  /* -----------------------------
     FETCH MARKET PRICE
  ------------------------------ */
  async function fetchMarketPrice() {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );

      const data = await res.json();
      setMarketPrice(data.ethereum.usd);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Market fetch error:", err);
    }
  }

  /* -----------------------------
     UPDATE ORACLE PRICE
  ------------------------------ */
  async function updatePrice(newPrice: number) {
    try {
      if (!window.ethereum) return;

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        ORACLE_ADDRESS,
        ORACLE_ABI,
        signer
      );

      const tx = await contract.updateAnswer(
        ethers.parseUnits(newPrice.toString(), 8)
      );

      await tx.wait();

      fetchOraclePrice(); // refresh after update
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  /* -----------------------------
     INITIAL LOAD + POLLING
  ------------------------------ */
  useEffect(() => {
    fetchOraclePrice();
    fetchMarketPrice();

    const interval = setInterval(() => {
      fetchOraclePrice();
      fetchMarketPrice();
    }, 10000); // every 10s (cleaner than 2s)

    return () => clearInterval(interval);
  }, []);

  return {
  price,
  marketPrice,
  lastUpdated,
  updatePrice,
  loading,
  connectWallet,
  account,
};
}