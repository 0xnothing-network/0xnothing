"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "@/components/PixelButton";

interface AIPromptGeneratorProps {
  gridSize: number;
  onApplyPixelData?: (pixelData: string[][]) => void;
}

export function AIPromptGenerator({ gridSize, onApplyPixelData }: AIPromptGeneratorProps) {
  const [generated, setGenerated] = useState("");
  const [parsed, setParsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseGridData = (text: string): string[][] => {
    const newPixelData: string[][] = Array(gridSize).fill(null).map(() =>
      Array(gridSize).fill("transparent")
    );

    const pattern = /\[(\d+),(\d+)\]\s*=\s*(#[0-9A-Fa-f]{6})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const x = parseInt(match[1]);
      const y = parseInt(match[2]);
      const color = match[3].toUpperCase();

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        newPixelData[y][x] = color;
      }
    }

    return newPixelData;
  };

  const handleParse = () => {
    if (!generated.trim()) return;

    const pixelData = parseGridData(generated);
    if (onApplyPixelData) {
      onApplyPixelData(pixelData);
      setParsed(true);
      setTimeout(() => setParsed(false), 2000);
    }
  };

  const count = (generated.match(/\[(\d+),(\d+)\]\s*=\s*(#[0-9A-Fa-f]{6})/g) || []).length;

  if (!mounted) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/10 animate-pulse" />
          <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-8 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-purple-400/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
          </svg>
        </div>
        <p className="text-[var(--muted)] text-xs">Grid data parser</p>
      </div>

      <textarea
        value={generated}
        onChange={(e) => setGenerated(e.target.value)}
        placeholder="[0,0]=#FF0000&#10;[1,0]=#00FF00"
        className="w-full px-3 py-2 rounded-xl bg-white/5 text-white placeholder-[var(--muted-dark)] focus:outline-none focus:border-white/10 resize-none font-mono text-[11px] leading-relaxed border border-transparent transition-all"
        rows={4}
      />

      {count > 0 && (
        <p className="text-[var(--muted-dark)] text-[11px] mt-1.5">{count} pixel{count !== 1 ? "s" : ""} detected</p>
      )}

      <PixelButton
        variant="secondary"
        onClick={handleParse}
        disabled={!generated.trim()}
        className="w-full mt-2.5"
        style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
      >
        {parsed ? "APPLIED!" : "APPLY TO CANVAS"}
      </PixelButton>
    </div>
  );
}
