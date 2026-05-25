import { NextResponse } from "next/server";
import { publicClient, getContractAddress } from "@/lib/contract";
import { PixelNFTABI } from "@/lib/abi";

const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

export async function GET() {
  if (!ETHERSCAN_KEY) {
    return NextResponse.json({ totalFees: "0", error: "No API key" }, { status: 200 });
  }

  try {
    const contractAddress = getContractAddress() as `0x${string}`;

    // Get treasury address from contract
    const treasury = await publicClient.readContract({
      address: contractAddress,
      abi: PixelNFTABI,
      functionName: "treasury",
    }) as string;

    // Get treasury balance
    const balanceUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${treasury}&tag=latest&apikey=${ETHERSCAN_KEY}`;
    const balanceRes = await fetch(balanceUrl, { next: { revalidate: 60 } });
    const balanceJson = await balanceRes.json();

    // Get transaction count
    const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_KEY}`;
    const txRes = await fetch(txUrl, { next: { revalidate: 60 } });
    const txJson = await txRes.json();

    let txCount = 0;
    if (txJson.status === "1" && Array.isArray(txJson.result)) {
      txCount = txJson.result.filter((tx: { isError: string }) => tx.isError === "0").length;
    }

    let totalFees = "0";
    if (balanceJson.status === "1" && balanceJson.result) {
      const balanceWei = BigInt(balanceJson.result);
      const eth = Number(balanceWei) / 1e18;
      totalFees = eth < 0.0001 ? "< 0.0001" : eth.toFixed(4);
    }

    return NextResponse.json({ totalFees, txCount });
  } catch {
    return NextResponse.json({ totalFees: "0", txCount: 0 });
  }
}
