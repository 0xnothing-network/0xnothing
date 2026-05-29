"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { encodeFunctionData } from "viem";
import { PixelNFTABI } from "@/lib/abi";
import { PixelButton } from "@/components/PixelButton";

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
  const { data: _balance } = useBalance({ address }); // eslint-disable-line @typescript-eslint/no-unused-vars
  const { sendTransactionAsync } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasDrawing = pixelData.some(row => row.some(cell => cell !== "transparent"));

  const generatePixelArt = useCallback((): string => {
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
  }, [pixelData, gridSize]);

  const pixelDataBase64 = useMemo(() => {
    if (!hasDrawing) return "";
    return generatePixelArt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrawing]);

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

  const { data: isOriginal, isLoading: isCheckingOriginal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PixelNFTABI,
    functionName: "checkOriginality",
    args: [pixelDataBase64, BigInt(gridSize)],
    query: {
      enabled: hasDrawing && !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  const { data: _originalCreator } = useReadContract({ // eslint-disable-line @typescript-eslint/no-unused-vars
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
      const error = err as { shortMessage?: string; message?: string; details?: string };
      const msg = error.shortMessage || error.message || error.details || "";
      console.error("Mint error:", err);
      if (msg.includes("already minted")) {
        setError("This artwork has already been minted!");
      } else {
        setError(msg || "Failed to mint. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canMint = !isLoading && name.trim() && hasDrawing && isOriginal !== false;

  if (!mounted) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-4 space-y-4 border border-[var(--border)]">
        <div className="space-y-3">
          <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-4 space-y-4 border border-[var(--border)]">
      {/* Not connected */}
      {!isConnected ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="var(--primary)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
              <path d="M16 16l2 2 4-4" />
            </svg>
          </div>
          <p className="text-[var(--muted)] text-sm">Connect wallet to mint</p>
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
              className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-white placeholder-[var(--muted-dark)] focus:outline-none focus:border-indigo-500/40 transition-all text-sm"
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 256))}
            placeholder="Description (optional)"
            maxLength={256}
            rows={2}
            className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-white placeholder-[var(--muted-dark)] focus:outline-none focus:border-indigo-500/40 transition-all resize-none text-sm"
          />

          {/* Originality */}
          {hasDrawing && (
            <div className="rounded-xl px-3 py-2.5 border text-xs font-medium">
              {isCheckingOriginal ? (
                <span className="text-[var(--muted)] flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  Checking...
                </span>
              ) : isOriginal === false ? (
                <span className="flex items-center gap-1.5" style={{ color: "rgba(239,68,68,0.8)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Already minted
                </span>
              ) : (
                <span className="flex items-center gap-1.5" style={{ color: "rgba(16,185,129,0.8)" }}>
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
            <div className="p-2.5 rounded-xl border flex items-center gap-2" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.1)" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="rgba(248,113,113,0.7)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs" style={{ color: "rgba(248,113,113,0.8)" }}>{error}</p>
            </div>
          )}

          {/* Success */}
          {txHash && (
            <div className="p-2.5 rounded-xl border" style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.1)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(16,185,129,0.8)" }}>
                {isConfirmed ? "Minted successfully!" : isConfirming ? "Waiting for confirmation..." : "Transaction submitted"}
              </p>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] hover:underline flex items-center gap-1"
                style={{ color: "rgba(99,102,241,0.7)" }}
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
          <PixelButton
            variant="indigo"
            onClick={handleMint}
            disabled={!canMint}
            loading={isLoading || isConfirming || isCheckingOriginal}
          >
            {isConfirming ? "CONFIRMING..." : isCheckingOriginal ? "CHECKING..." : isOriginal === false ? "ALREADY MINTED" : !hasDrawing ? "DRAW FIRST" : !name.trim() ? "ENTER NAME" : (
              <>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                MINT NFT
              </>
            )}
          </PixelButton>
        </>
      )}
    </div>
  );
}
