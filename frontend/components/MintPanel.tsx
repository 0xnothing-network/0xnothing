"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { encodeFunctionData } from "viem";
import { PixelNFTABI } from "@/lib/abi";

interface MintPanelProps {
  pixelData: string[][];
  gridSize: number;
  onMintSuccess: (tokenId: bigint) => void;
}

export function MintPanel({ pixelData, gridSize, onMintSuccess }: MintPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: _balance } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasDrawing = pixelData.some(row => row.some(cell => cell !== "transparent"));

  const generatePixelArt = (): string => {
    if (typeof document === "undefined") return "";
    const OUTPUT_SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const pixelSize = OUTPUT_SIZE / gridSize;

    ctx.fillStyle = "#0F0F23";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const color = pixelData[y]?.[x] || "transparent";
        if (color !== "transparent") {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    return canvas.toDataURL("image/png").split(",")[1];
  };

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  const pixelDataBase64 = hasDrawing ? generatePixelArt() : "";

  const { data: isOriginal, isLoading: isCheckingOriginal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PixelNFTABI,
    functionName: "checkOriginality",
    args: [pixelDataBase64, BigInt(gridSize)],
    query: {
      enabled: hasDrawing && !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  const { data: _originalCreator } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PixelNFTABI,
    functionName: "getOriginalCreator",
    args: [pixelDataBase64, BigInt(gridSize)],
    query: {
      enabled: hasDrawing && !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" && isOriginal === false,
    },
  });

  const handleMint = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first!");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a name for your pixel art!");
      return;
    }

    if (!hasDrawing) {
      setError("Please draw something first!");
      return;
    }

    setIsLoading(true);
    setTxHash(null);
    setError(null);

    try {
      const pixelDataBase64ForMint = generatePixelArt();
      const CONTRACT_ADDRESS_MINT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

      if (!CONTRACT_ADDRESS_MINT || CONTRACT_ADDRESS_MINT === "0x0000000000000000000000000000000000000000") {
        setError("Contract not deployed! Please deploy the contract first.");
        setIsLoading(false);
        return;
      }

      const data = encodeFunctionData({
        abi: PixelNFTABI,
        functionName: "mint",
        args: [name.trim(), description.trim(), BigInt(gridSize), pixelDataBase64ForMint],
      });

      const hash = await sendTransactionAsync({
        to: CONTRACT_ADDRESS_MINT as `0x${string}`,
        value: BigInt(0),
        data,
      });

      setTxHash(hash);

      if (isConfirmed) {
        onMintSuccess(BigInt(0));
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Mint error:", err);
      if (error.message?.includes("already minted")) {
        setError("This artwork has already been minted!");
      } else {
        setError("Failed to mint. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canMint = !isLoading && name.trim() && hasDrawing && isOriginal !== false;

  if (!mounted) {
    return (
      <div className="bg-[#13131F] rounded-2xl p-4 space-y-4 border border-white/5">
        <div className="space-y-3">
          <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#13131F] rounded-2xl p-4 space-y-4 border border-white/5">
      {/* Not connected */}
      {!isConnected ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="#6366F1" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
              <path d="M16 16l2 2 4-4" />
            </svg>
          </div>
          <p className="text-[#64748B] text-sm">Connect wallet to mint</p>
        </div>
      ) : (
        <>
          {/* Name */}
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder="Artwork name"
              maxLength={32}
              className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-white placeholder-[#4B5563] focus:outline-none focus:border-indigo-500/40 transition-all text-sm"
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 256))}
            placeholder="Description (optional)"
            maxLength={256}
            rows={2}
            className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-white placeholder-[#4B5563] focus:outline-none focus:border-indigo-500/40 transition-all resize-none text-sm"
          />

          {/* Originality */}
          {hasDrawing && (
            <div className="rounded-xl px-3 py-2.5 border text-xs font-medium">
              {isCheckingOriginal ? (
                <span className="text-[#64748B] flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  Checking...
                </span>
              ) : isOriginal === false ? (
                <span className="text-red-400/80 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Already minted
                </span>
              ) : (
                <span className="text-emerald-400/80 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Original — ready to mint
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-2.5 bg-red-500/5 rounded-xl border border-red-500/10 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400/80 text-xs">{error}</p>
            </div>
          )}

          {/* Success */}
          {txHash && (
            <div className="p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <p className="text-emerald-400/80 text-xs font-medium mb-1">
                {isConfirmed ? "Minted successfully!" : isConfirming ? "Waiting for confirmation..." : "Transaction submitted"}
              </p>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400/70 text-[11px] hover:underline flex items-center gap-1"
              >
                View on Etherscan
                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                </svg>
              </a>
            </div>
          )}

          {/* Mint button */}
          <button
            onClick={handleMint}
            disabled={!canMint}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              !canMint
                ? "bg-white/5 text-[#4B5563] cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isLoading || isConfirming || isCheckingOriginal ? (
              <>
                <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                {isConfirming ? "Confirming..." : "Processing..."}
              </>
            ) : isOriginal === false ? (
              "Already minted"
            ) : !hasDrawing ? (
              "Draw something first"
            ) : !name.trim() ? (
              "Enter a name"
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Mint NFT
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
