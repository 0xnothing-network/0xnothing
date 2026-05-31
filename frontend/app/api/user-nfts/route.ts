import { NextRequest, NextResponse } from "next/server";

const OPENSEA_KEY = process.env.OPENSEA_API_KEY || "";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=100`;
    const res = await fetch(url, {
      headers: OPENSEA_KEY ? { "X-API-KEY": OPENSEA_KEY } : {},
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenSea API error:", text);
      return NextResponse.json({ error: "OpenSea API failed" }, { status: 502 });
    }

    const json = await res.json();
    const allNfts: Array<{ identifier: string }> = [];
    let cursor: string | undefined;

    do {
      const pageUrl = cursor
        ? `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=100&next=${cursor}`
        : `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=100`;
      const pageRes = await fetch(pageUrl, {
        headers: OPENSEA_KEY ? { "X-API-KEY": OPENSEA_KEY } : {},
        next: { revalidate: 30 },
      });
      if (!pageRes.ok) break;
      const pageJson = await pageRes.json();
      allNfts.push(...(pageJson.nfts || []));
      cursor = pageJson.next;
    } while (cursor);

    const ids = allNfts.map((nft) => BigInt(nft.identifier));

    return NextResponse.json({
      ids: ids.map((id: bigint) => id.toString()),
      source: "opensea",
    });
  } catch (error) {
    console.error("Error fetching user NFTs:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
