// App.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion } from "framer-motion";
import './index.css';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useRef } from "react";


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
    coingeckoId: "wb-ethereum",
    logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
};

const tokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)"
];

const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const priceFeedABI = [
  "function latestAnswer() view returns (int256)"
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenKey, setTokenKey] = useState<string>("MXT");
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

  const loadTokenData = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(token.address, tokenABI, signer);
      const balance = await contract.balanceOf(userAddress);
      setTokenBalance(ethers.formatUnits(balance, token.decimals));
    } catch (error) {
      console.error("Failed to read token data:", error);
    }
  };

  const loadETHPrice = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);
      const price = await priceFeed.latestAnswer();
      setEthPrice(`$${(Number(price) / 1e8).toFixed(2)}`);
    } catch (error) {
      console.error("Failed to fetch ETH price:", error);
      setEthPrice("Error");
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <motion.div className="text-6xl text-center text-white animate-pulse">💀</motion.div>
          <motion.div className="text-center">
            <h1 className="text-4xl font-bold text-blue-400">MaveriX Oracle dApp</h1>
            <p className="text-gray-400">Chainlink | Sepolia | Token Control</p>
          </motion.div>

          <div className="flex justify-center gap-4">
            {Object.entries(TOKENS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setTokenKey(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${tokenKey === key ? "border-blue-400 bg-gray-900" : "border-gray-700"}`}
              >
                <img src={info.logo} alt={info.symbol} className="w-6 h-6" />
                <span>{info.symbol}</span>
              </button>
            ))}
          </div>

          <div className="text-center space-y-1">
            <p><strong>Token Price (USD):</strong> {tokenPriceUsd}</p>
            <p><strong>ETH/USD:</strong> {ethPrice}</p>
          </div>

          {!account ? (
            <div className="text-center">
              <button
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-800 p-4 rounded-xl">
                <p><strong>Wallet:</strong> {account}</p>
                <p><strong>Balance:</strong> {tokenBalance} {token.symbol}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-xl">
                  <h3 className="text-xl font-semibold mb-2">Send Tokens</h3>
                  <input type="text" placeholder="Recipient Address" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                  <input type="text" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                  <button onClick={transferTokens} className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded">Send</button>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-800 p-4 rounded-xl">
                    <h3 className="text-xl font-semibold mb-2">Mint Tokens</h3>
                    <input type="text" placeholder="Amount to Mint" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                    <button onClick={mintTokens} className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">Mint</button>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-xl">
                    <h3 className="text-xl font-semibold mb-2">Burn Tokens</h3>
                    <input type="text" placeholder="Amount to Burn" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                    <button onClick={burnTokens} className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Burn</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Dashboard: Transaction History */}
        <div className="bg-gray-800 p-4 rounded-xl h-full overflow-y-auto">
          <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
          {txHistory.length === 0 ? (
            <p className="text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="space-y-4">
              {txHistory.map((tx, index) => (
                <motion.li key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="bg-gray-900 p-4 rounded border border-gray-700">
                  <div className="text-sm">
                    <span className="text-yellow-400">[{tx.timestamp}]</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                      tx.type === 'Transfer' ? 'bg-green-700 text-green-200' :
                      tx.type === 'Mint' ? 'bg-purple-700 text-purple-200' :
                      'bg-red-700 text-red-200'
                    }`}>
                      {tx.type}
                    </span>
                    <div className="mt-2">{tx.amount} to {tx.to}</div>
                    <div>
                      TX: <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">{tx.txHash}</a>
                    </div>
                    <div className="text-gray-400">Gas Used: {tx.gasUsed}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default App;

