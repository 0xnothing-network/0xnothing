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
      <div className="rounded-xl p-4 animate-pulse" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="h-6 rounded-lg mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-24 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-8 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="18" height="18" fill="none" stroke="var(--primary)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 6v6l4 2" />
        </svg>
        <h3 className="text-white font-semibold text-sm">Grid data parser</h3>
      </div>

      <textarea
        value={generated}
        onChange={(e) => setGenerated(e.target.value)}
        placeholder="[0,0]=#FF0000&#10;[1,0]=#00FF00"
        className="w-full px-3 py-2 rounded-xl bg-white/5 text-white placeholder-[var(--muted-dark)] focus:outline-none focus:border-white/10 resize-none font-mono text-[11px] leading-relaxed border border-transparent transition-all"
        rows={4}
      />

      {count > 0 && (
        <p className="text-[var(--muted-dark)] text-xs mt-2 mb-2">{count} pixel{count !== 1 ? "s" : ""} detected</p>
      )}

      <PixelButton
        variant={parsed ? "emerald" : "secondary"}
        onClick={handleParse}
        className="w-full justify-center"
      >
        {parsed ? "APPLIED!" : "APPLY TO CANVAS"}
      </PixelButton>
    </div>
  );
}
