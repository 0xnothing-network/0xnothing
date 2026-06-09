"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { publicClient } from "@/lib/contract";
import { GridSkeleton } from "@/components/Skeleton";
import { PixelButton } from "@/components/PixelButton";
import { getUserNFTs, formatEther, getContractAddress } from "@/lib/contract";
import { PixelNFTABI } from "@/lib/abi";

interface NFTItem {
  tokenId: bigint;
  data: { name: string; description: string; gridSize: number | bigint; pixelData: string; price: bigint; creator: string; mintedAt?: bigint; artworkHash?: string } | null;
  imageUrl: string;
  isForSale: boolean;
}

export default function GalleryPage() {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: "success" | "error" | "pending"; message: string } | null>(null);
  const [txPending, setTxPending] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const fetchUserTokens = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const nfts = await getUserNFTs(address);
      setTokens(nfts as NFTItem[]);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      setTxStatus({ type: "error", message: "Failed to load your NFTs" });
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserTokens();
    } else {
      setTokens([]);
    }
  }, [isConnected, address, fetchUserTokens]);

  const handleDelist = useCallback(async (tokenId: bigint) => {
    setTxStatus({ type: "pending", message: "Removing from marketplace..." });
    setTxPending(true);
    try {
      const estimatedGas = await publicClient.estimateContractGas({
        address: getContractAddress() as `0x${string}`,
        abi: PixelNFTABI,
        functionName: "delist",
        args: [tokenId],
        account: address,
      });
      const gasLimit = (estimatedGas * 150n) / 100n;

      const hash = await writeContractAsync({
        address: getContractAddress() as `0x${string}`,
        abi: PixelNFTABI,
        functionName: "delist",
        args: [tokenId],
        gas: gasLimit,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus({ type: "success", message: "Listing removed!" });
      fetchUserTokens();
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string; details?: string };
      const msg = error.shortMessage || error.message || error.details || "Transaction failed";
      setTxStatus({ type: "error", message: msg });
    } finally {
      setTxPending(false);
    }
  }, [writeContractAsync, fetchUserTokens]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: "var(--font-departure)" }}>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Gallery</h1>
          <p className="text-[#94A3B8]">
            View and manage your pixel art NFTs
          </p>
          <a
            href="https://opensea.io/collection/0xpixel-eth"
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-btn pixel-btn-secondary text-xs inline-flex items-center gap-2 mt-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            VIEW ON OPENSEA
          </a>
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

      {!isConnected ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1A1A2E] rounded-2xl flex items-center justify-center border border-[#2D2D44]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
              <path d="M16 16l2 2 4-4" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-sm mx-auto">
            Connect your wallet to view your pixel art collection
          </p>
        </div>
      ) : isLoading ? (
        <GridSkeleton count={8} />
      ) : tokens.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1A1A2E] rounded-2xl flex items-center justify-center border border-[#2D2D44]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            No Pixel Art Yet
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-sm mx-auto">
            Start creating and mint your first pixel art NFT
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/pixel" className="pixel-btn pixel-btn-indigo" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 10 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              START DRAWING
            </Link>
            <a
              href="https://opensea.io/collection/0xpixel-eth"
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-btn pixel-btn-secondary text-xs inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              VIEW ON OPENSEA
            </a>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 nft-grid">
          {tokens.map((nft) => (
            <div
              key={nft.tokenId.toString()}
              className="nft-card group bg-[#1A1A2E] rounded-2xl overflow-hidden border border-[#2D2D44] hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div className="relative aspect-square bg-[#0F0F23] flex items-center justify-center overflow-hidden">
                <img
                  src={nft.imageUrl}
                  alt={nft.data?.name || "Pixel Art"}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <a
                  href={`https://opensea.io/assets/ethereum/0x7bA34514171c5874a8484a31aF30a2e8D9D60f79/${nft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-[#1A1A2E]/80 backdrop-blur-sm p-1.5 rounded-lg border border-[#2D2D44] hover:border-indigo-500/50 transition-colors opacity-0 group-hover:opacity-100"
                  title="View on OpenSea"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="text-white font-bold text-base truncate">
                  {nft.data?.name || "Untitled"}
                </h3>
                <div className="flex items-center gap-2 text-[#94A3B8] text-xs">
                  <span className="font-mono">#{nft.tokenId.toString()}</span>
                  <span>•</span>
                  <span>{nft.data?.gridSize?.toString()}×{nft.data?.gridSize?.toString()}</span>
                </div>
                {nft.data?.description && (
                  <p className="text-[#94A3B8] text-xs line-clamp-2 leading-relaxed">
                    {nft.data.description}
                  </p>
                )}
                {nft.isForSale && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8] text-xs">Price</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {formatEther(nft.data?.price || 0n)} ETH
                    </span>
                  </div>
                )}
                {nft.isForSale && (
                  <PixelButton
                    variant="red"
                    size="sm"
                    loading={txPending}
                    onClick={() => handleDelist(nft.tokenId)}
                  >
                    REMOVE LISTING
                  </PixelButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="border-t border-white/5 py-5 mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs">
            <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
              <Image src="/0xNothing-by.jpg" alt="0xNothing" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
              <span>by 0xNothing</span>
            </Link>
          </div>
          <p className="text-[#4B5563] text-xs">Built on Ethereum</p>
        </div>
      </footer>
    </div>
  );
}