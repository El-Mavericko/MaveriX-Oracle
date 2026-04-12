import { useState } from "react";
import { ethers } from "ethers";
import { ORACLE_ABI, getNetworkConfig } from "@/src/app/constants";
import { useWeb3 } from "@/src/app/context";
import { useToast } from "@/src/app/context";

export function useOracleWriter() {
  const { signer, chainId } = useWeb3();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);

  async function updatePrice(newPrice: number) {
    if (!signer) return;
    const { oracleAddress } = getNetworkConfig(chainId);
    try {
      setLoading(true);
      const contract = new ethers.Contract(oracleAddress, ORACLE_ABI, signer);
      const tx = await contract.updateAnswer(ethers.parseUnits(newPrice.toString(), 8));
      await tx.wait();
      addToast(`Oracle updated to $${newPrice.toFixed(2)}`, "success");
    } catch (err) {
      console.error("Update error:", err);
      addToast("Oracle update failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return { updatePrice, loading };
}
