import { useEffect, useState } from "react";
import { ethers } from "ethers";

const tokenAddress = "0x8ec06564305BF5624a784d943572Bc1A0ccB8166";

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

function App() {
  const [account, setAccount] = useState(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [ethPrice, setEthPrice] = useState("Loading...");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [txHistory, setTxHistory] = useState(() => {
    const saved = localStorage.getItem("txHistory");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("txHistory", JSON.stringify(txHistory));
  }, [txHistory]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAccount = accounts[0];
      setAccount(userAccount);
      await loadTokenData(userAccount);
      await loadETHPrice();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const loadTokenData = async (userAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const name = await contract.name();
      const symbol = await contract.symbol();
      const balance = await contract.balanceOf(userAddress);
      const formatted = ethers.formatUnits(balance, 18);
      setTokenName(name);
      setTokenSymbol(symbol);
      setTokenBalance(formatted);
    } catch (error) {
      console.error("Failed to read token data:", error);
    }
  };

  const loadETHPrice = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);
      const price = await priceFeed.latestAnswer();
      const formattedPrice = (Number(price) / 1e8).toFixed(2);
      setEthPrice(`$${formattedPrice}`);
    } catch (error) {
      console.error("Failed to fetch ETH price:", error);
      setEthPrice("Error");
    }
  };

  const addToHistory = (type, amount, to, txHash, gasUsed) => {
    const newEntry = {
      type,
      amount,
      to,
      txHash,
      gasUsed,
      timestamp: new Date().toLocaleTimeString()
    };
    setTxHistory((prev) => [newEntry, ...prev]);
  };

  const transferTokens = async () => {
    if (!recipient || !amount) {
      alert("Please enter both recipient address and amount.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const parsedAmount = ethers.parseUnits(amount, 18);
      const tx = await contract.transfer(recipient, parsedAmount);
      const receipt = await tx.wait();
      alert(`Transfer successful! Hash: ${tx.hash}`);
      addToHistory("Transfer", amount, recipient, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account);
    } catch (error) {
      console.error("Token transfer failed:", error);
      alert("Transfer failed. Check console for details.");
    }
  };

  const mintTokens = async () => {
    if (!mintAmount) {
      alert("Enter mint amount");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const parsedAmount = ethers.parseUnits(mintAmount, 18);
      const tx = await contract.mint(account, parsedAmount);
      const receipt = await tx.wait();
      alert(`Minted ${mintAmount} ${tokenSymbol}`);
      addToHistory("Mint", mintAmount, account, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account);
    } catch (error) {
      console.error("Mint failed:", error);
      alert("Minting failed. You might not be the contract owner.");
    }
  };

  const burnTokens = async () => {
    if (!burnAmount) {
      alert("Enter burn amount");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const parsedAmount = ethers.parseUnits(burnAmount, 18);
      const tx = await contract.burn(account, parsedAmount);
      const receipt = await tx.wait();
      alert(`Burned ${burnAmount} ${tokenSymbol}`);
      addToHistory("Burn", burnAmount, account, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account);
    } catch (error) {
      console.error("Burn failed:", error);
      alert("Burn failed. You might not be the owner.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>MaveriX Oracle dApp</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p><strong>Connected Wallet:</strong> {account}</p>
          <p><strong>Token:</strong> {tokenName} ({tokenSymbol})</p>
          <p><strong>Your Balance:</strong> {tokenBalance} {tokenSymbol}</p>
          <p><strong>ETH/USD Price:</strong> {ethPrice}</p>

          <hr style={{ margin: "2rem 0" }} />
          <h3>Send {tokenSymbol} Tokens</h3>
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={{ width: "300px", padding: "0.5rem" }}
          /><br /><br />
          <input
            type="text"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "300px", padding: "0.5rem" }}
          /><br /><br />
          <button onClick={transferTokens}>Send</button>

          <hr style={{ margin: "2rem 0" }} />
          <h3>Mint {tokenSymbol}</h3>
          <input
            type="text"
            placeholder="Amount to Mint"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            style={{ width: "300px", padding: "0.5rem" }}
          /><br /><br />
          <button onClick={mintTokens}>Mint</button>

          <hr style={{ margin: "2rem 0" }} />
          <h3>Burn {tokenSymbol}</h3>
          <input
            type="text"
            placeholder="Amount to Burn"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            style={{ width: "300px", padding: "0.5rem" }}
          /><br /><br />
          <button onClick={burnTokens}>Burn</button>

          <hr style={{ margin: "2rem 0" }} />
          <h3>Transaction History</h3>
          {txHistory.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <ul>
              {txHistory.map((tx, index) => (
                <li key={index}>
                  [{tx.timestamp}] <strong>{tx.type}</strong> {tx.amount} to {tx.to} <br />
                  TX: <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer">{tx.txHash}</a><br />
                  Gas Used: {tx.gasUsed}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default App;






