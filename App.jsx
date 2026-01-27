import { ethers } from "ethers";

const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

const priceFeedABI = [
  "function latestAnswer() view returns (int256)"
];

async function loadETHPrice() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);
    const price = await priceFeed.latestAnswer();
    const formattedPrice = (Number(price) / 1e8).toFixed(2);
    console.log(`ETH/USD Price: $${formattedPrice}`);
    return formattedPrice;
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    return null;
  }
}

export default loadETHPrice;
