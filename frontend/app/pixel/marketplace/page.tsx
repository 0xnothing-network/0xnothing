"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { GridSkeleton } from "@/components/Skeleton";
import { getMarketplaceNFTs, formatEther, getContractAddress } from "@/lib/contract";
import { PixelNFTABI } from "@/lib/abi";
import { parseEther } from "viem";
import Link from "next/link";

interface TokenData {
  name: string;
  description: string;
  gridSize: number | bigint;
  pixelData: string;
  price: bigint;
  creator: string;
}

interface NFTItem {
  tokenId: bigint;
  data: TokenData | null;
  imageUrl: string;
  owner: string;
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<bigint | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null);
  const [txStatus, setTxStatus] = useState<{ type: "success" | "error" | "pending"; message: string } | null>(null);
  const [gridFilter, setGridFilter] = useState<number | "all">("all");

  const { data: buyHash, writeContract: buyNFT } = useWriteContract();
  const { isLoading: isBuying, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyHash });

  const { data: listHash, writeContract: listForSale } = useWriteContract();
  const { isLoading: isListing, isSuccess: listSuccess } = useWaitForTransactionReceipt({ hash: listHash });

  useEffect(() => {
    fetchNFTsForSale();
  }, []);

  useEffect(() => {
    if (buySuccess || listSuccess) {
      fetchNFTsForSale();
      setBuyingId(null);
      setShowListingModal(false);
      setSelectedTokenId(null);
      setListingPrice("");
      setTxStatus({
        type: "success",
        message: buySuccess ? "NFT purchased successfully!" : "Price updated successfully!",
      });
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [buySuccess, listSuccess]);

  const fetchNFTsForSale = async () => {
    setIsLoading(true);
    try {
      const marketplaceNfts = await getMarketplaceNFTs();
      setNfts(marketplaceNfts as NFTItem[]);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setTxStatus({ type: "error", message: "Failed to load marketplace" });
    } finally {
      setIsLoading(false);
    }
  };

  const displayedNfts =
    gridFilter === "all"
      ? nfts
      : nfts.filter((n) => Number(n.data?.gridSize) === gridFilter);

  const handleBuy = (tokenId: bigint, price: bigint) => {
    setTxStatus({ type: "pending", message: "Purchasing NFT..." });
    setBuyingId(tokenId);
    buyNFT({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "buyNFT",
      args: [tokenId],
      value: price,
    });
  };

  const handleList = () => {
    if (!selectedTokenId || !listingPrice) return;
    setTxStatus({ type: "pending", message: "Updating price..." });
    const priceInWei = parseEther(listingPrice);
    listForSale({
      address: getContractAddress() as `0x${string}`,
      abi: PixelNFTABI,
      functionName: "listForSale",
      args: [selectedTokenId, priceInWei],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Marketplace</h1>
          <p className="text-[#94A3B8]">
            Discover and collect unique pixel art NFTs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A2E] px-4 py-2 rounded-xl border border-[#2D2D44] flex items-center gap-2">
            <span className="text-[#94A3B8] text-sm">Platform Fee</span>
            <span className="text-indigo-400 font-bold">5%</span>
          </div>
          <div className="bg-[#1A1A2E] px-4 py-2 rounded-xl border border-[#2D2D44]">
            <span className="text-[#94A3B8] text-sm">{nfts.length} </span>
            <span className="text-white text-sm font-medium">NFTs listed</span>
          </div>
        </div>
      </div>

      {/* Grid Size Filter */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-[#64748B] text-sm">Grid:</span>
        {(["all", 8, 16, 24, 32, 48, 64] as const).map((size) => (
          <button
            key={size}
            onClick={() => setGridFilter(size)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              gridFilter === size
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "bg-[#1A1A2E] text-[#94A3B8] border border-[#2D2D44] hover:border-indigo-500/50 hover:text-white"
            }`}
          >
            {size === "all" ? "All" : `${size}×${size}`}
          </button>
        ))}
      </div>

      {/* Toast */}
      {txStatus && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-3 ${
          txStatus.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
          txStatus.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
          "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
        }`}>
          {txStatus.type === "pending" && (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {txStatus.type === "success" && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {txStatus.type === "error" && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {txStatus.message}
          <button onClick={() => setTxStatus(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {isLoading ? (
        <GridSkeleton count={8} />
      ) : nfts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1A1A2E] rounded-2xl flex items-center justify-center border border-[#2D2D44]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
              <path d="M3 3h18v18H3z" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No NFTs for Sale</h2>
          <p className="text-[#94A3B8] max-w-sm mx-auto">
            Be the first to list your pixel art NFT on the marketplace
          </p>
          <Link
            href="/pixel"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Pixel Art
          </Link>
        </div>
      ) : displayedNfts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1A1A2E] rounded-2xl flex items-center justify-center border border-[#2D2D44]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No {gridFilter}×{gridFilter} NFTs</h2>
          <p className="text-[#94A3B8] max-w-sm mx-auto">
            No listings found for this grid size. Try another filter.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedNfts.map((nft) => {
            const isOwn = address && nft.owner?.toLowerCase() === address.toLowerCase();
            const isBuyingThis = buyingId === nft.tokenId;

            return (
              <div
                key={nft.tokenId.toString()}
                className="group bg-[#1A1A2E] rounded-2xl overflow-hidden border border-[#2D2D44] hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
              >
                <div className="relative aspect-square bg-[#0F0F23] p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={nft.imageUrl}
                    alt={nft.data?.name || "Pixel Art"}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-bold text-base truncate">
                      {nft.data?.name || "Untitled"}
                    </h3>
                    <div className="flex items-center gap-2 text-[#94A3B8] text-xs mt-0.5">
                      <span className="font-mono">#{nft.tokenId.toString()}</span>
                      <span>•</span>
                      <span>{nft.data?.gridSize?.toString()}×{nft.data?.gridSize?.toString()}</span>
                    </div>
                  </div>

                  {nft.data?.description && (
                    <p className="text-[#94A3B8] text-xs line-clamp-2 leading-relaxed">
                      {nft.data.description}
                    </p>
                  )}

                  <div className="pt-3 border-t border-[#2D2D44] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8] text-sm">Price</span>
                      <span className="text-emerald-400 font-bold text-xl">
                        {formatEther(nft.data?.price || 0n)} <span className="text-sm font-medium">ETH</span>
                      </span>
                    </div>

                    {nft.owner && (
                      <div className="flex items-center gap-1.5 text-[#64748B] text-xs">
                        <span>Seller</span>
                        <span className="font-mono text-[#94A3B8]">
                          {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                        </span>
                      </div>
                    )}

                    {isOwn ? (
                      <button
                        onClick={() => {
                          setSelectedTokenId(nft.tokenId);
                          setShowListingModal(true);
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#2D2D44] hover:bg-[#3D3D54] text-white text-sm font-medium transition-all border border-[#3D3D54]"
                      >
                        Edit Price
                      </button>
                    ) : isConnected ? (
                      <button
                        onClick={() => handleBuy(nft.tokenId, nft.data?.price || 0n)}
                        disabled={isBuyingThis}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        {isBuyingThis && isBuying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Purchasing...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M3 3h18v18H3zM12 8v8M8 12h8" />
                            </svg>
                            Buy Now
                          </>
                        )}
                      </button>
                    ) : (
                      <p className="text-center text-[#94A3B8] text-sm py-2">
                        Connect wallet to buy
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing Modal */}
      {showListingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowListingModal(false)}>
          <div className="bg-[#1A1A2E] rounded-2xl p-6 w-full max-w-md border border-[#2D2D44] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-xl">Update Price</h3>
              <button onClick={() => setShowListingModal(false)} className="w-8 h-8 rounded-lg bg-[#2D2D44] hover:bg-[#3D3D54] flex items-center justify-center text-[#94A3B8] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[#94A3B8] text-sm mb-6 leading-relaxed">
              Set the price for your NFT. A <span className="text-amber-400 font-medium">5% platform fee</span> will be deducted on each sale.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Price (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="0.05"
                  className="w-full px-4 py-3 rounded-xl bg-[#2D2D44] text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2 border border-[#2D2D44]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">You receive</span>
                  <span className="text-white font-medium">
                    {listingPrice ? (parseFloat(listingPrice) * 0.95).toFixed(4) : "0"} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">Platform fee (5%)</span>
                  <span className="text-amber-400 font-medium">
                    {listingPrice ? (parseFloat(listingPrice) * 0.05).toFixed(4) : "0"} ETH
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowListingModal(false); setSelectedTokenId(null); setListingPrice(""); }}
                  className="flex-1 py-3 rounded-xl bg-[#2D2D44] text-white font-medium hover:bg-[#3D3D54] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleList}
                  disabled={!listingPrice || isListing}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
                >
                  {isListing ? "Updating..." : "Update Price"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/5 py-5 mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs">
            <a href="/" className="flex items-center gap-2 hover:text-white transition-colors">
              <img src="/0xNothing.jpg" alt="0xNothing" className="w-5 h-5 rounded-full object-cover" />
              <span>by 0xNothing</span>
            </a>
          </div>
          <p className="text-[#4B5563] text-xs">Powered by Ethereum</p>
        </div>
      </footer>
    </div>
  );
}
