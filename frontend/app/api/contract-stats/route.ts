import { NextResponse } from "next/server";

const CONTRACT = "0x7bE3B9035AAAcB57b6634eCBa65402e37E30Bf66";
const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

export async function GET() {
  if (!ETHERSCAN_KEY) {
    return NextResponse.json({ totalFees: "0", error: "No API key" }, { status: 200 });
  }

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${CONTRACT}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();

    if (json.status !== "1" || !json.result || !Array.isArray(json.result)) {
      return NextResponse.json({ totalFees: "0", txCount: 0 });
    }

    const txs = json.result as Array<{ gasUsed: string; gasPrice: string; isError: string }>;
    const successfulTxs = txs.filter((tx) => tx.isError === "0");

    let totalFees = 0n;
    for (const tx of successfulTxs) {
      totalFees += BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
    }

    const eth = Number(totalFees) / 1e18;
    const formatted = eth < 0.0001 ? "< 0.0001" : eth.toFixed(4);

    return NextResponse.json({ totalFees: formatted, txCount: successfulTxs.length });
  } catch {
    return NextResponse.json({ totalFees: "0", txCount: 0 });
  }
}
