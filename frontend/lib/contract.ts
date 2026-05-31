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
  score: bigint;
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
    const raw = await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "tokenData",
      args: [tokenId],
    });
    // viem decodes struct returns as a tuple — map by index:
    // [0]=name, [1]=description, [2]=gridSize, [3]=pixelData, [4]=price,
    // [5]=creator, [6]=mintedAt, [7]=artworkHash, [8]=score
    const tuple = raw as unknown as [string, string, bigint, string, bigint, string, bigint, string, bigint];
    const result: TokenData = {
      name: tuple[0],
      description: tuple[1],
      gridSize: tuple[2],
      pixelData: tuple[3],
      price: tuple[4],
      creator: tuple[5],
      mintedAt: tuple[6],
      artworkHash: tuple[7],
      score: tuple[8],
    };
    tokenDataCache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error(`[Gallery] tokenData(${tokenId}) error:`, err);
    tokenDataCache.set(key, { data: null, timestamp: Date.now() });
    return null;
  }
}

const userNftCache = new Map<string, { ids: bigint[]; timestamp: number }>();

async function getUserTokenIds(address: string): Promise<bigint[]> {
  const addr = address.toLowerCase() as `0x${string}`;
  const contractAddr = getContractAddress() as `0x${string}`;

  const cached = userNftCache.get(addr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.ids;
  }

  // Primary: read directly from contract storage via balanceOf + userTokens
  try {
    const balance = await publicClient.readContract({
      address: contractAddr,
      abi: PixelNFTABI,
      functionName: "balanceOf",
      args: [addr],
    });
    const n = Number(balance as bigint);

    if (n === 0) {
      userNftCache.set(addr, { ids: [], timestamp: Date.now() });
      return [];
    }

    const BATCH = 10;
    const allIds: bigint[] = [];

    for (let i = 0; i < n; i += BATCH) {
      const batch = Array.from({ length: Math.min(BATCH, n - i) }, (_, j) => i + j);
      const results = await Promise.allSettled(
        batch.map((idx) =>
          publicClient.readContract({
            address: contractAddr,
            abi: PixelNFTABI,
            functionName: "userTokens",
            args: [addr, BigInt(idx)],
          })
        )
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value !== 0n) {
          allIds.push(r.value as bigint);
        }
      }
    }

    const ids = allIds.filter((id, idx) => allIds.indexOf(id) === idx);
    userNftCache.set(addr, { ids, timestamp: Date.now() });
    return ids.sort((a, b) => Number(a - b));
  } catch (err) {
    console.error("[Gallery] getUserTokenIds error:", err);
    userNftCache.set(addr, { ids: [], timestamp: Date.now() });
    return [];
  }
}

export async function getMintedTokens(address: string) {
  return getUserTokenIds(address);
}

export async function getUserNFTs(address: string) {
  const tokenIds = await getUserTokenIds(address);
  if (tokenIds.length === 0) return [];

  const datas = await Promise.all(tokenIds.map((id) => fetchTokenDataCached(id)));

  return tokenIds
    .map((id, i) => ({
      tokenId: id,
      data: datas[i],
      imageUrl: datas[i]?.pixelData ? `data:image/png;base64,${datas[i]!.pixelData}` : "",
      isForSale: datas[i] ? datas[i]!.price > 0n : false,
    }))
    .filter((nft) => nft.data !== null && nft.imageUrl !== "");
}

export async function getTokenData(tokenId: bigint) {
  return fetchTokenDataCached(tokenId);
}

export async function getPrice(tokenId: bigint) {
  try {
    const raw = await publicClient.readContract({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "tokenData",
      args: [tokenId],
    });
    const tuple = raw as unknown as [string, string, bigint, string, bigint, string, bigint, string, bigint];
    return tuple[4]; // price is at index 4
  } catch {
    return 0n;
  }
}

export async function getNFTsForSale() {
  try {
    const contractAddr = getContractAddress() as `0x${string}`;
    const maxTokenId = 100n;
    const results: bigint[] = [];

    const isListedResults = await Promise.allSettled(
      Array.from({ length: Number(maxTokenId) }, (_, i) => {
        const tokenId = BigInt(i + 1);
        return publicClient.readContract({
          address: contractAddr,
          abi: PixelNFTABI,
          functionName: "isTokenListed",
          args: [tokenId],
        })
          .then((listed) => (listed ? tokenId : null))
          .catch(() => null);
      })
    );

    for (const r of isListedResults) {
      if (r.status === "fulfilled" && r.value !== null) {
        results.push(r.value);
      }
    }
    return results.sort((a, b) => Number(a - b));
  } catch (err) {
    console.error("[Marketplace] getNFTsForSale error:", err);
    return [];
  }
}

export async function getMarketplaceNFTs() {
  const tokenIds = await getNFTsForSale();
  const [results, ownerResults] = await Promise.all([
    Promise.allSettled(tokenIds.map((id) => fetchTokenDataCached(id))),
    Promise.allSettled(
      tokenIds.map(async (tokenId) => {
        const owner = await publicClient.readContract({
          address: getContractAddress() as `0x${string}`,
          abi: PixelNFTABI,
          functionName: "ownerOf",
          args: [tokenId],
        });
        return owner as string;
      })
    ),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<TokenData | null> =>
        r.status === "fulfilled"
    )
    .map((r, i) => ({
      tokenId: tokenIds[i],
      data: r.value,
      imageUrl: r.value?.pixelData
        ? `data:image/png;base64,${r.value.pixelData}`
        : "",
      owner:
        ownerResults[i].status === "fulfilled"
          ? ownerResults[i].value
          : "",
    }))
    .filter((nft) => nft.data !== null && nft.imageUrl !== "");
}
