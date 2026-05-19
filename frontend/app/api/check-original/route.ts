import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "wagmi/chains";
import { PixelNFTABI } from "@/lib/abi";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function POST(request: NextRequest) {
  try {
    const { pixelData, gridSize } = await request.json();

    if (!pixelData || !gridSize) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!alchemyUrl || !CONTRACT_ADDRESS) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: http(alchemyUrl),
    });

    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: PixelNFTABI,
        functionName: "checkOriginality",
        args: [pixelData, BigInt(gridSize)],
      });

      const isOriginal = !result;

      let creator = null;
      if (!isOriginal) {
        try {
          creator = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: PixelNFTABI,
            functionName: "getOriginalCreator",
            args: [pixelData, BigInt(gridSize)],
          });
        } catch {
          // ignore
        }
      }

      return NextResponse.json({ isOriginal, creator });
    } catch {
      return NextResponse.json({ isOriginal: true, creator: null });
    }
  } catch (error) {
    console.error("Check originality error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
