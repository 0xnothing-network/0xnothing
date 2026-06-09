"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useReadContract, useEstimateGas } from "wagmi";
import { encodeFunctionData } from "viem";
import { publicClient } from "@/lib/contract";
import { PixelNFTABI } from "@/lib/abi";
import { PixelButton } from "@/components/PixelButton";
import { pixelDataToOnchainText, pixelDataToPNG } from "@/lib/gridParser";

interface MintPanelProps {
  pixelData: string[][];
  gridSize: number;
  onMintSuccess: (tokenId: bigint) => void;
}

const DEBOUNCE_MS = 600;

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

  const hasDrawing = pixelData.some(row => row.some(cell => cell !== "transparent"));

  // Refs for debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate preview PNG synchronously for UI only
  const previewBase64 = useMemo(() => {
    if (!hasDrawing) return "";
    return pixelDataToPNG(pixelData, gridSize);
  }, [pixelData, gridSize, hasDrawing]);

  // Build compact on-chain payload once and reuse it for originality checks + mint
  const onchainPixelData = useMemo(() => {
    if (!hasDrawing) return "";
    return pixelDataToOnchainText(pixelData, gridSize);
  }, [pixelData, gridSize, hasDrawing]);

  // Generate stable hash for originality check (debounced)
  const pixelDataHash = useMemo(() => {
    if (!hasDrawing) return "";
    return onchainPixelData;
  }, [onchainPixelData, hasDrawing]);

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

  // Debounced on-chain payload for originality checks
  const [debouncedOnchainPixelData, setDebouncedOnchainPixelData] = useState("");
  const debouncedOnchainPixelDataRef = useRef("");

  useEffect(() => {
    if (!hasDrawing || !CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setDebouncedOnchainPixelData("");
      debouncedOnchainPixelDataRef.current = "";
      lastCheckedRef.current = "";
      return;
    }

    // Skip if data hasn't actually changed
    const currentHash = pixelDataHash;
    if (currentHash === lastCheckedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      debouncedOnchainPixelDataRef.current = onchainPixelData;
      lastCheckedRef.current = currentHash;
      setDebouncedOnchainPixelData(onchainPixelData);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [pixelDataHash, hasDrawing, CONTRACT_ADDRESS, onchainPixelData]);

  // Only re-fetch when debounced on-chain payload actually changes
  const { data: isOriginal, isLoading: isCheckingOriginal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PixelNFTABI,
    functionName: "checkOriginal",
    args: [debouncedOnchainPixelData, BigInt(gridSize)],
    query: {
      enabled: !!debouncedOnchainPixelData && !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  const { data: _originalCreator } = useReadContract({ // eslint-disable-line @typescript-eslint/no-unused-vars
    address: CONTRACT_ADDRESS,
    abi: PixelNFTABI,
    functionName: "getCreator",
    args: [debouncedOnchainPixelData, BigInt(gridSize)],
    query: {
      enabled: !!debouncedOnchainPixelData && !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" && isOriginal === false,
    },
  });

  // Notify parent when mint succeeds
  useEffect(() => {
    if (isConfirmed && txHash) {
      onMintSuccess(BigInt(0));
    }
  }, [isConfirmed, txHash, onMintSuccess]);

  const handleMint = useCallback(async () => {
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
      const pixelDataForMint = onchainPixelData;

      const CONTRACT_ADDRESS_MINT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

      if (!CONTRACT_ADDRESS_MINT || CONTRACT_ADDRESS_MINT === "0x0000000000000000000000000000000000000000") {
        setError("Contract not deployed! Please deploy the contract first.");
        setIsLoading(false);
        return;
      }

      const data = encodeFunctionData({
        abi: PixelNFTABI,
        functionName: "mint",
        args: [name.trim(), description.trim(), BigInt(gridSize), pixelDataForMint],
      });

      const estimatedGas = await publicClient.estimateGas({
        account: address,
        to: CONTRACT_ADDRESS_MINT as `0x${string}`,
        data,
        value: 0n,
      });
      const gasLimit = (estimatedGas * 150n) / 100n;

      const hash = await sendTransactionAsync({
        to: CONTRACT_ADDRESS_MINT as `0x${string}`,
        value: BigInt(0),
        data,
        gas: gasLimit,
      });

      setTxHash(hash);
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
  }, [isConnected, address, name, description, hasDrawing, gridSize, sendTransactionAsync, onchainPixelData]);

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
      {/* NFT Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[var(--muted-dark)] text-[10px] font-mono uppercase tracking-wider">NFT Preview</p>
          <div className="flex items-center gap-1.5">
            {hasDrawing ? (
              isCheckingOriginal ? (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(99,102,241,0.5)" }}>
                  <span className="w-2 h-2 border border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  checking
                </span>
              ) : isOriginal === false ? (
                <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(239,68,68,0.7)" }}>TAKEN</span>
              ) : (
                <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(16,185,129,0.7)" }}>ORIGINAL</span>
              )
            ) : null}
          </div>
        </div>

        <div
          className="relative rounded-xl overflow-hidden border"
          style={{
            background: "#0F0F23",
            aspectRatio: "1 / 1",
            borderColor: hasDrawing ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
          }}
        >
          {hasDrawing ? (
            <img
              src={`data:image/png;base64,${previewBase64}`}
              alt="NFT Preview"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <svg width="32" height="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-[var(--muted-dark)] text-[10px]">Draw something to see preview</p>
            </div>
          )}

          {/* Gradient overlay */}
          {hasDrawing && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)" }} />
          )}
        </div>
      </div>

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