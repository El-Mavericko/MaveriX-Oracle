// App.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion } from "framer-motion";
import './index.css';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useRef } from "react";
import NeonDashboard from "./NeonDashboard";



ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

interface Transaction {
  type: string;
  amount: string;
  to: string;
  txHash: string;
  gasUsed: string;
  timestamp: string;
}

interface TokenInfo {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  coingeckoId: string;
  logo: string;
}

const TOKENS: Record<string, TokenInfo> = {
  MXT: {
    name: "MaveriX Token",
    symbol: "MXT",
    address: "0x8ec06564305BF5624a784d943572Bc1A0ccB8166",
    decimals: 18,
    coingeckoId: "",
    logo: "/mxt-logo.png",
  },
  WETH: {
    name: "Wrapped ETH",
    symbol: "WETH",
    address: "0xdd13E55209Fd76AfE204dBda4007C227904f0a81",
    decimals: 18,
    coingeckoId: "weth",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  WBTC: {
  name: "Wrapped BTC",
  symbol: "WBTC",
  address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  decimals: 8,
  coingeckoId: "wrapped-bitcoin", // ← ✅ FIXED
  logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
};

const tokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)",
  "function owner() view returns (address)"

];

const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const priceFeedABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenKey, setTokenKey] = useState<string>("MX");
  const [tokenBalance, setTokenBalance] = useState<string>("");
  const [tokenPriceUsd, setTokenPriceUsd] = useState<string>("Loading...");
  const [ethPrice, setEthPrice] = useState<string>("Loading...");
  const [ethChartData, setEthChartData] = useState<number[]>([]);
const [ethChartLabels, setEthChartLabels] = useState<string[]>([]);
const priceInterval = useRef<NodeJS.Timeout | null>(null);

const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [burnAmount, setBurnAmount] = useState<string>("");
  const [txHistory, setTxHistory] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("txHistory");
    return saved ? JSON.parse(saved) : [];
  });

  const token = TOKENS[tokenKey];

  useEffect(() => {
    localStorage.setItem("txHistory", JSON.stringify(txHistory));
  }, [txHistory]);

  useEffect(() => {
    if (account) {
      loadTokenData(account);
      fetchTokenPrice(token.coingeckoId);
      loadETHPrice();
      fetchEthChartData();
    }
  }, [tokenKey, account]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask is not installed.");
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

console.log("Current tokenKey:", tokenKey);
console.log("Resolved token:", token);

  const loadTokenData = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
     const contract = new ethers.Contract("0x8ec06564305BF5624a784d943572Bc1A0ccB8166", tokenABI, signer);
const balance = await contract.balanceOf(userAddress);
setTokenBalance(ethers.formatUnits(balance, 18));
} catch (error) {
      console.error("Failed to read token data:", error);
    }
  };

  const loadETHPrice = async () => {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await res.json();
    setEthPrice(`$${data.ethereum.usd}`);
  } catch (err) {
    console.error("ETH/USD fetch failed:", err);
    setEthPrice("Error");
  }
};


  const fetchEthChartData = async () => {
try {
const { data } = await axios.get(
`https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=7`
);
const prices = data.prices;
const chartLabels = prices.map((p: number[]) =>
new Date(p[0]).toLocaleDateString()
);
const chartData = prices.map((p: number[]) => parseFloat(p[1].toFixed(2)));


setEthChartLabels(chartLabels);
setEthChartData(chartData);
} catch (err) {
console.error("Failed to fetch ETH chart data", err);
}
};

  const fetchTokenPrice = async (coingeckoId: string) => {
    if (!coingeckoId) {
      setTokenPriceUsd("Price N/A");
      return;
    }
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
      );
      const price = data[coingeckoId]?.usd;
      setTokenPriceUsd(price ? `$${price}` : "N/A");
    } catch (error) {
      console.error("CoinGecko fetch failed:", error);
      setTokenPriceUsd("Error");
    }
  };

  const addToHistory = (type: string, amount: string, to: string, txHash: string, gasUsed: string) => {
    const newEntry: Transaction = {
      type, amount, to, txHash, gasUsed,
      timestamp: new Date().toLocaleTimeString()
    };
    setTxHistory((prev) => [newEntry, ...prev]);
  };

  const getTokenContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(token.address, tokenABI, signer);
  }

  const transferTokens = async () => {
    if (!recipient || !amount) return alert("Please enter recipient and amount.");
    try {
      const contract = await getTokenContract();
      const tx = await contract.transfer(recipient, ethers.parseUnits(amount, token.decimals));
      const receipt = await tx.wait();
      addToHistory("Transfer", amount, recipient, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account!);
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

 const mintTokens = async () => {
  if (tokenKey !== "MXT") {
    alert("Minting is only allowed for MXT");
    return;
  }

  if (!mintAmount) return alert("Enter mint amount");

  try {
    const contract = await getTokenContract();
    const tx = await contract.mint(account, ethers.parseUnits(mintAmount, token.decimals));
    const receipt = await tx.wait();
    addToHistory("Mint", mintAmount, account!, tx.hash, receipt.gasUsed.toString());
    await loadTokenData(account!);
  } catch (error) {
    console.error("Mint failed:", error);
  }
};



 const burnTokens = async () => {
    if (!burnAmount) return alert("Enter burn amount");
    try {
      const contract = await getTokenContract();
      const tx = await contract.burn(account, ethers.parseUnits(burnAmount, token.decimals));
      const receipt = await tx.wait();
      addToHistory("Burn", burnAmount, account!, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account!);
    } catch (error) {
      console.error("Burn failed:", error);
    }
  };

  return (
<NeonDashboard
  tokens={TOKENS}
  account={account}
  tokenBalance={tokenBalance}
  token={token}
  ethPrice={ethPrice}
  tokenPriceUsd={tokenPriceUsd}
  ethChartLabels={ethChartLabels}
  ethChartData={ethChartData}
  txHistory={txHistory}
  connectWallet={connectWallet}
  transferTokens={transferTokens}
  mintTokens={mintTokens}
  burnTokens={burnTokens}
  recipient={recipient}
  setRecipient={setRecipient}
  amount={amount}
  setAmount={setAmount}
  mintAmount={mintAmount}
  setMintAmount={setMintAmount}
  burnAmount={burnAmount}
  setBurnAmount={setBurnAmount}
  tokenKey={tokenKey}
  setTokenKey={setTokenKey}

/>

);

}

export default App;
;
}

export default App;

