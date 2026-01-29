import { ethers } from "ethers";

const CHAINLINK_FEEDS = {
  11155111: "0x694AA1769357215DE4FAC081bf1f309aDC325306", 
};

const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
];

export async function loadETHPrice() {
  try {
    if (!window.ethereum) {
      return { price: null, error: "MetaMask not detected" };
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const feedAddress = CHAINLINK_FEEDS[network.chainId];

    if (!feedAddress) {
      return { price: null, error: `Unsupported network (Chain ID: ${network.chainId})` };
    }

    const priceFeed = new ethers.Contract(feedAddress, PRICE_FEED_ABI, provider);
    const rawPrice = await priceFeed.latestAnswer();
    const formatted = ethers.formatUnits(rawPrice, 8);

    return { price: formatted, error: null };
  } catch (err) {
    console.error("Error fetching ETH price:", err);
    return { price: null, error: "Failed to fetch price" };
  }
}
