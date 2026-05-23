"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Canvas } from "@/components/Canvas";
import { Toolbar } from "@/components/Toolbar";
import { MintPanel } from "@/components/MintPanel";
import { AIPromptGenerator } from "@/components/AIPromptGenerator";

export default function PixelPage() {
  const DEFAULT_GRID_SIZE = 16;
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [pixelData, setPixelData] = useState<string[][]>(() =>
    Array(DEFAULT_GRID_SIZE).fill(null).map(() => Array(DEFAULT_GRID_SIZE).fill("transparent"))
  );
  const [history, setHistory] = useState<string[][][]>([]);
  const [selectedColor, setSelectedColor] = useState("#6366F1");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPixelData(Array(gridSize).fill(null).map(() => Array(gridSize).fill("transparent")));
    setHistory([]);
  }, [gridSize]);

  const handleClear = () => {
    setHistory(h => [...h, pixelData.map(row => [...row])].slice(-50));
    setPixelData(Array(gridSize).fill(null).map(() => Array(gridSize).fill("transparent")));
  };

  const handleApplyPixelData = (newPixelData: string[][]) => {
    setHistory(h => [...h, pixelData.map(row => [...row])].slice(-50));
    setPixelData(newPixelData);
  };

  const handleStrokeStart = () => {
    setHistory(h => [...h, pixelData.map(row => [...row])].slice(-50));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setPixelData(prev);
  };

  const canUndo = history.length > 0;

  const handleMintSuccess = (tokenId: bigint) => {
    console.log("Minted:", tokenId);
  };

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
            Create your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">pixel masterpiece</span>
          </h1>
          <p className="text-[var(--muted-light)] text-base md:text-lg max-w-md mx-auto">
            Draw. Mint. Trade on Ethereum.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        <div className="grid xl:grid-cols-[280px_1fr_360px] gap-6">
          {/* Toolbar */}
          <div className="order-2 xl:order-1">
            <div className="xl:sticky xl:top-20">
              <Toolbar
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                onClear={handleClear}
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="order-1 xl:order-2 flex justify-center">
            <Canvas
              gridSize={gridSize}
              pixelData={pixelData}
              setPixelData={setPixelData}
              selectedColor={selectedColor}
              onColorPick={setSelectedColor}
              onStrokeStart={handleStrokeStart}
              onUndo={handleUndo}
              canUndo={canUndo}
            />
          </div>

          {/* Right Panel - Mint + AI Prompt */}
          <div className="order-3 space-y-4">
            <MintPanel
              pixelData={pixelData}
              gridSize={gridSize}
              onMintSuccess={handleMintSuccess}
            />
            <AIPromptGenerator
              gridSize={gridSize}
              onApplyPixelData={handleApplyPixelData}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs">
            <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
              <Image src="/0xNothing-by.jpg" alt="0xNothing" width={20} height={20} priority className="w-5 h-5 rounded-full object-cover" />
              <span>by 0xNothing</span>
            </Link>
          </div>
          <p className="text-[var(--muted-dark)] text-xs">Built on Ethereum</p>
        </div>
      </footer>
    </div>
  );
}
