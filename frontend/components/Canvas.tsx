"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { downloadAsPNG, downloadAsJSON, pixelDataToJSON } from "@/lib/gridParser";
import { PixelButton } from "@/components/PixelButton";

interface CanvasProps {
  gridSize: number;
  pixelData: string[][];
  setPixelData: React.Dispatch<React.SetStateAction<string[][]>>;
  selectedColor: string;
  onColorPick?: (color: string) => void;
  onStrokeStart?: (dataBeforeStroke: string[][]) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

type Tool = "pencil" | "eraser" | "fill" | "picker";

export function Canvas({ gridSize, pixelData, setPixelData, selectedColor, onColorPick, onStrokeStart, onUndo, canUndo }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const currentToolRef = useRef<Tool>("pencil");
  const selectedColorRef = useRef(selectedColor);
  const pixelDataRef = useRef(pixelData);
  const strokeSnapshotRef = useRef<string[][] | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<Tool>("pencil");

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    pixelDataRef.current = pixelData;
  }, [pixelData]);

  const drawGrid = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const containerSize = Math.min(container.clientWidth, container.clientHeight);
      const cs = Math.floor(containerSize / gridSize);
      const gridDisplaySize = cs * gridSize * zoom;
      const offsetX = (container.clientWidth - gridDisplaySize) / 2 - pan.x * zoom;
      const offsetY = (container.clientHeight - gridDisplaySize) / 2 - pan.y * zoom;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      ctx.fillStyle = "#0F0F23";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#1A1A2E";
      ctx.fillRect(offsetX, offsetY, gridDisplaySize, gridDisplaySize);

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const color = pixelData[y]?.[x];
          if (color && color !== "transparent") {
            ctx.fillStyle = color;
            const px = offsetX + x * cs * zoom;
            const py = offsetY + y * cs * zoom;
            ctx.fillRect(px, py, cs * zoom, cs * zoom);

            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(px, py, cs * zoom, 1);
            ctx.fillRect(px, py, 1, cs * zoom);

            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.fillRect(px, py + cs * zoom - 1, cs * zoom, 1);
            ctx.fillRect(px + cs * zoom - 1, py, 1, cs * zoom);
          }
        }
      }

      ctx.strokeStyle = zoom >= 1.5 ? "#252540" : "#1F1F3A";
      ctx.lineWidth = zoom >= 1.5 ? 1 : 0.5;
      for (let i = 0; i <= gridSize; i++) {
        const px = offsetX + i * cs * zoom;
        ctx.beginPath();
        ctx.moveTo(px, offsetY);
        ctx.lineTo(px, offsetY + gridDisplaySize);
        ctx.stroke();

        const py = offsetY + i * cs * zoom;
        ctx.beginPath();
        ctx.moveTo(offsetX, py);
        ctx.lineTo(offsetX + gridDisplaySize, py);
        ctx.stroke();
      }
    });
  }, [pixelData, gridSize, zoom, pan]);

  useEffect(() => {
    drawGrid();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [drawGrid]);

  useEffect(() => {
    const handleResize = () => drawGrid();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGrid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        onUndo?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo]);

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const targetColor = pixelData[startY]?.[startX] || "transparent";
    if (targetColor === fillColor) return;

    const newData = pixelData.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (
        x < 0 || x >= gridSize ||
        y < 0 || y >= gridSize ||
        (newData[y]?.[x] || "transparent") !== targetColor
      ) continue;

      newData[y][x] = fillColor;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    setPixelData(newData);
  }, [pixelData, gridSize, setPixelData]);

  const drawPixel = useCallback((x: number, y: number, tool: Tool, color: string) => {
    setPixelData(prev => {
      const next = prev.map(row => [...row]);
      next[y][x] = tool === "eraser" ? "transparent" : color;
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const containerSize = Math.min(container.clientWidth, container.clientHeight);
    const cs = Math.floor(containerSize / gridSize);
    const gridDisplaySize = cs * gridSize * zoom;
    const offsetX = (container.clientWidth - gridDisplaySize) / 2 - pan.x * zoom;
    const offsetY = (container.clientHeight - gridDisplaySize) / 2 - pan.y * zoom;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor((clickX - offsetX) / (cs * zoom));
    const gridY = Math.floor((clickY - offsetY) / (cs * zoom));

    if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) return;

    isDrawingRef.current = true;
    const tool = currentToolRef.current;

    if (tool === "pencil" || tool === "eraser") {
      if (!strokeSnapshotRef.current) {
        strokeSnapshotRef.current = pixelDataRef.current.map(row => [...row]);
        if (onStrokeStart) onStrokeStart(strokeSnapshotRef.current);
      }
    }

    if (tool === "fill") {
      isDrawingRef.current = false;
      floodFill(gridX, gridY, selectedColorRef.current);
      if (onStrokeStart) onStrokeStart(pixelDataRef.current);
      return;
    }

    if (tool === "picker") {
      isDrawingRef.current = false;
      const pickedColor = pixelData[gridY]?.[gridX];
      if (pickedColor && pickedColor !== "transparent" && onColorPick) {
        onColorPick(pickedColor);
      }
      return;
    }

    strokeSnapshotRef.current = pixelData.map(row => [...row]);
    onStrokeStart?.(strokeSnapshotRef.current);
    drawPixel(gridX, gridY, tool, selectedColorRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, zoom, pan, floodFill, drawPixel]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / zoom;
      const dy = (e.clientY - panStartRef.current.y) / zoom;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const containerSize = Math.min(container.clientWidth, container.clientHeight);
    const cs = Math.floor(containerSize / gridSize);
    const gridDisplaySize = cs * gridSize * zoom;
    const offsetX = (container.clientWidth - gridDisplaySize) / 2 - pan.x * zoom;
    const offsetY = (container.clientHeight - gridDisplaySize) / 2 - pan.y * zoom;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor((clickX - offsetX) / (cs * zoom));
    const gridY = Math.floor((clickY - offsetY) / (cs * zoom));

    if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) return;

    const tool = currentToolRef.current;
    if (tool === "pencil" || tool === "eraser") {
      drawPixel(gridX, gridY, tool, selectedColorRef.current);
    }
  }, [gridSize, zoom, pan, drawPixel]);

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    isPanningRef.current = false;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tool + Zoom bar */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="flex gap-0.5 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)]">
          <ToolButton active={currentTool === "pencil"} onClick={() => setCurrentTool("pencil")} title="Pencil">
            <PencilIcon />
          </ToolButton>
          <ToolButton active={currentTool === "eraser"} onClick={() => setCurrentTool("eraser")} title="Eraser">
            <EraserIcon />
          </ToolButton>
          <ToolButton active={currentTool === "fill"} onClick={() => setCurrentTool("fill")} title="Fill">
            <FillIcon />
          </ToolButton>
          <ToolButton active={currentTool === "picker"} onClick={() => setCurrentTool("picker")} title="Color Picker">
            <PickerIcon />
          </ToolButton>

          <div className="w-px h-6 bg-[var(--border)] mx-0.5" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${canUndo ? "text-[var(--muted)] hover:text-white hover:bg-white/5" : "text-[var(--muted-dark)] cursor-not-allowed"}`}
          >
            <UndoIcon />
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--border)]" />

        <div className="flex items-center gap-0.5 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)]">
          <button onClick={() => setZoom(z => Math.max(z / 1.5, 0.5))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-all" title="Zoom Out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-[var(--muted)] text-[11px] w-10 text-center font-mono bg-white/5 rounded-md py-1">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z * 1.5, 10))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-all" title="Zoom In">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold" title="Reset View">R</button>
        </div>

        <div className="px-2.5 py-1.5 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="text-[var(--muted)] text-[11px] font-mono">{gridSize}×{gridSize}</span>
        </div>

        <ExportMenu pixelData={pixelData} gridSize={gridSize} />
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-[480px] flex justify-center items-center overflow-hidden bg-[var(--background)] rounded-xl border border-[var(--border)]"
        style={{ aspectRatio: "1 / 1" }}
      >
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: "pixelated",
            cursor: currentTool === "fill" ? "cell" : currentTool === "picker" ? "crosshair" : "crosshair",
            width: "100%",
            height: "100%",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={(e) => { e.preventDefault(); setZoom(z => e.deltaY < 0 ? Math.min(z * 1.2, 10) : Math.max(z / 1.2, 0.5)); }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <p className="text-[var(--muted-dark)] text-[11px]">Scroll to zoom · Right-click to pan</p>
    </div>
  );
}

function ToolButton({ children, active, onClick, title }: { children: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${active ? "bg-white/10 text-white" : "text-[var(--muted)] hover:text-white hover:bg-white/5"}`}>
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

function FillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
      <path d="m5 2 5 5" />
      <path d="M2 13h15" />
      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
    </svg>
  );
}

function PickerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9" />
    </svg>
  );
}

function ExportMenu({ pixelData, gridSize }: { pixelData: string[][]; gridSize: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasDrawing = pixelData.some(row => row.some(cell => cell !== "transparent"));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`pixel-btn pixel-btn-secondary pixel-btn-sm flex items-center gap-1.5 ${open ? "text-white" : ""}`}
        style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700 }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        EXPORT
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 80ms", transform: open ? "rotate(180deg)" : "" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "4px 4px 0 0 #060614, -1px -1px 0 0 rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => { navigator.clipboard.writeText(pixelDataToJSON(pixelData, gridSize)); setOpen(false); }}
            disabled={!hasDrawing}
            className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: hasDrawing ? "var(--muted-light)" : "var(--muted-dark)" }}
            onMouseEnter={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "var(--muted-light)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            COPY GRID DATA
          </button>
          <div style={{ height: 1, background: "var(--border)" }} />
          <button
            onClick={() => { downloadAsPNG(pixelData, gridSize); setOpen(false); }}
            disabled={!hasDrawing}
            className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: hasDrawing ? "var(--muted-light)" : "var(--muted-dark)" }}
            onMouseEnter={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "var(--muted-light)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            PNG IMAGE
          </button>
          <div style={{ height: 1, background: "var(--border)" }} />
          <button
            onClick={() => { downloadAsJSON(pixelData, gridSize); setOpen(false); }}
            disabled={!hasDrawing}
            className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: hasDrawing ? "var(--muted-light)" : "var(--muted-dark)" }}
            onMouseEnter={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { if (hasDrawing) (e.target as HTMLElement).style.color = "var(--muted-light)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            DOWNLOAD GRID DATA
          </button>
        </div>
      )}
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}
