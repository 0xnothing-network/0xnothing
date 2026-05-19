"use client";

import { useState } from "react";

interface AIPromptGeneratorProps {
  gridSize: number;
  onApplyPixelData?: (pixelData: string[][]) => void;
}

export function AIPromptGenerator({ gridSize, onApplyPixelData }: AIPromptGeneratorProps) {
  const [generated, setGenerated] = useState("");
  const [parsed, setParsed] = useState(false);

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

  return (
    <div className="bg-[#13131F] rounded-2xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-purple-400/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
          </svg>
        </div>
        <p className="text-[#64748B] text-xs">Grid data parser</p>
      </div>

      <textarea
        value={generated}
        onChange={(e) => setGenerated(e.target.value)}
        placeholder="[0,0]=#FF0000&#10;[1,0]=#00FF00"
        className="w-full px-3 py-2 rounded-xl bg-white/5 text-white placeholder-[#4B5563] focus:outline-none focus:border-white/10 resize-none font-mono text-[11px] leading-relaxed border border-transparent transition-all"
        rows={4}
      />

      {count > 0 && (
        <p className="text-[#4B5563] text-[11px] mt-1.5">{count} pixel{count !== 1 ? "s" : ""} detected</p>
      )}

      <button
        onClick={handleParse}
        disabled={!generated.trim()}
        className="w-full mt-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#64748B] hover:text-white border border-transparent hover:border-white/10 transition-all duration-150 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {parsed ? "Applied!" : "Apply to canvas"}
      </button>
    </div>
  );
}
