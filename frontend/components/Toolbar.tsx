"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "@/components/PixelButton";

interface ToolbarProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  onClear: () => void;
}

const PRESET_COLORS = [
  "#000000", "#ffffff", "#c0c0c0",
  "#ff0000", "#ff4444", "#ee4b2b", "#aa0000",
  "#ff8800", "#ffcc00", "#00cc00", "#008800",
  "#0000ff", "#0088ff", "#00aaff", "#9400d3",
  "#8b4513", "#808080", "#333333",
];

const GRID_PRESETS = [8, 16, 32, 64];

export function Toolbar({
  selectedColor,
  onColorChange,
  gridSize,
  onGridSizeChange,
  onClear,
}: ToolbarProps) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    if (!recentColors.includes(color) && color !== "transparent") {
      setRecentColors(prev => [color, ...prev.slice(0, 7)]);
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] flex flex-col gap-5">
      {/* Loading skeleton */}
      {!mounted ? (
        <>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-12 bg-white/5 rounded animate-pulse" />
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-2 w-12 bg-white/5 rounded animate-pulse" />
            <div className="flex gap-1.5">
              {[8, 16, 32, 64].map((_, i) => (
                <div key={i} className="flex-1 h-8 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-8 bg-white/5 rounded-xl animate-pulse" />
        </>
      ) : (
        <>
          {/* Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl border border-white/10 flex-shrink-0"
          style={{ backgroundColor: selectedColor, boxShadow: `0 0 20px ${selectedColor}60` }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium mb-0.5">Current Color</p>
          <p className="text-[var(--muted)] text-xs font-mono uppercase">{selectedColor}</p>
        </div>
      </div>

      {/* Palette */}
      <div>
        <p className="text-[var(--muted-dark)] text-[11px] uppercase tracking-wider mb-2.5">Palette</p>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`aspect-square rounded-lg border-2 transition-all duration-150 hover:scale-105 ${
                selectedColor === color
                  ? "border-white scale-105 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                  : "border-transparent hover:border-white/20"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <p className="text-[var(--muted-dark)] text-[11px] uppercase tracking-wider mb-2">Custom</p>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => handleColorSelect(e.target.value)}
          className="w-full h-9 rounded-xl cursor-pointer"
        />
      </div>

      {/* Recent */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-[var(--muted-dark)] text-[11px] uppercase tracking-wider mb-2.5">Recent</p>
          <div className="flex gap-1.5 flex-wrap">
            {recentColors.map((color, i) => (
              <button
                key={`${color}-${i}`}
                onClick={() => handleColorSelect(color)}
                className={`w-6 h-6 rounded-md border-2 transition-all duration-150 hover:scale-110 ${
                  selectedColor === color
                    ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    : "border-transparent hover:border-white/20"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div>
        <p className="text-[var(--muted-dark)] text-[11px] uppercase tracking-wider mb-2">Grid</p>
        <div className="flex gap-1.5">
          {GRID_PRESETS.map((size) => (
            <button
              key={size}
              onClick={() => onGridSizeChange(size)}
              className={`flex-1 py-2 transition-all duration-150 ${
                gridSize === size
                  ? "pixel-btn pixel-btn-indigo pixel-btn-sm"
                  : "pixel-btn pixel-btn-secondary pixel-btn-sm"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      <PixelButton
        variant="red"
        size="sm"
        onClick={onClear}
        className="w-full"
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        CLEAR CANVAS
      </PixelButton>
        </>
      )}
    </div>
  );
}
