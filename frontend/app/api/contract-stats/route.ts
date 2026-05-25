import { NextResponse } from "next/server";
import { getContractAddress } from "@/lib/contract";

const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

export async function GET() {
  if (!ETHERSCAN_KEY) {
    return NextResponse.json({ totalFees: "0", error: "No API key" }, { status: 200 });
  }

  try {
    const contractAddress = getContractAddress();

    // Get all transactions to calculate gas fees burned
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();

    let totalFees = 0n;
    let txCount = 0;

    if (json.status === "1" && Array.isArray(json.result)) {
      const txs = json.result as Array<{ gasUsed: string; gasPrice: string; isError: string }>;
      const successfulTxs = txs.filter((tx) => tx.isError === "0");

      for (const tx of successfulTxs) {
        totalFees += BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
        txCount++;
      }
    }

    const eth = Number(totalFees) / 1e18;
    const formatted = eth < 0.0001 ? "< 0.0001" : eth.toFixed(4);

    return NextResponse.json({ totalFees: formatted, txCount });
  } catch {
    return NextResponse.json({ totalFees: "0", txCount: 0 });
  }
}
