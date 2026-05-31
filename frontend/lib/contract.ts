import { createPublicClient, http } from "viem";
import { mainnet } from "wagmi/chains";
import { PixelNFTABI } from "./abi";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!alchemyUrl) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_URL is not set.");
}

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(alchemyUrl),
});

export function getContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
  }
  return CONTRACT_ADDRESS;
}

export function formatEther(wei: bigint): string {
  const ether = Number(wei) / 1e18;
  if (ether === 0) return "0";
  if (ether < 0.0001) return "< 0.0001";
  return ether.toFixed(4);
}

interface TokenData {
  name: string;
  description: string;
  gridSize: bigint;
  pixelData: string;
  price: bigint;
  creator: string;
  mintedAt: bigint;
  artworkHash: string;
}

const tokenDataCache = new Map<string, { data: TokenData | null; timestamp: number }>();
const CACHE_TTL = 30_000;

async function fetchTokenDataCached(tokenId: bigint): Promise<TokenData | null> {
  const key = tokenId.toString();
  const cached = tokenDataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const data = await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "tokenData",
      args: [tokenId],
    });
    const result = data as unknown as TokenData;
    tokenDataCache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    tokenDataCache.set(key, { data: null, timestamp: Date.now() });
    return null;
  }
}

export async function getMintedTokens(address: string) {
  try {
    const tokens = await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "userTokens",
      args: [address as `0x${string}`],
    });
    return (tokens as bigint[]).sort((a, b) => Number(a - b));
  } catch {
    return [];
  }
}

export async function getUserNFTs(address: string) {
  const tokenIds = await getMintedTokens(address);
  const ownerPromises = tokenIds.map(async (id) => {
    try {
      const owner = await publicClient.readContract({
        address: getContractAddress() as `0x${string}`,
        abi: PixelNFTABI,
        functionName: "ownerOf",
        args: [id],
      });
      return { id, owner: owner as string };
    } catch {
      return { id, owner: "" };
    }
  });
  const dataPromises = tokenIds.map(id => fetchTokenDataCached(id));
  const [owners, datas] = await Promise.all([
    Promise.all(ownerPromises),
    Promise.all(dataPromises),
  ]);
  return tokenIds
    .map((id, i) => ({
      tokenId: id,
      data: datas[i],
      imageUrl: datas[i] ? `data:image/png;base64,${datas[i]!.pixelData}` : "",
      isForSale: datas[i] ? datas[i]!.price > 0n : false,
    }))
    .filter(nft => nft.data !== null);
}

export async function getTokenData(tokenId: bigint) {
  return fetchTokenDataCached(tokenId);
}

export async function getPrice(tokenId: bigint) {
  try {
    return await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "getPrice",
      args: [tokenId],
    }) as bigint;
  } catch {
    return 0n;
  }
}

export async function getNFTsForSale() {
  try {
    const tokens = await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "getNFTsForSale",
    });
    return (tokens as bigint[]).sort((a, b) => Number(a - b));
  } catch {
    return [];
  }
}

export async function getMarketplaceNFTs() {
  const tokenIds = await getNFTsForSale();
  const results = await Promise.allSettled(
    tokenIds.map(id => fetchTokenDataCached(id))
  );
  const ownerResults = await Promise.allSettled(
    tokenIds.map(async (tokenId) => {
      const owner = await publicClient.readContract({
        address: getContractAddress() as `0x${string}`,
        abi: PixelNFTABI,
        functionName: "ownerOf",
        args: [tokenId],
      });
      return owner as string;
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<TokenData | null> => r.status === "fulfilled")
    .map((r, i) => ({
      tokenId: tokenIds[i],
      data: r.value,
      imageUrl: r.value ? `data:image/png;base64,${r.value.pixelData}` : "",
      owner: ownerResults[i].status === "fulfilled" ? ownerResults[i].value : "",
    }))
    .filter(nft => nft.data !== null);
}
