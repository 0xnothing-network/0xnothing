/**
 * Grid data parser & exporter for pixel art.
 * Converts pixelData (string[][]) to PNG base64 or JSON for export/sharing.
 */

/** Convert pixelData 2D array to a PNG data URL (base64). */
export function pixelDataToPNG(pixelData: string[][], gridSize: number, outputSize = 512): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const pixelSize = outputSize / gridSize;

  ctx.fillStyle = "#0F0F23";
  ctx.fillRect(0, 0, outputSize, outputSize);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = pixelData[y]?.[x];
      if (color && color !== "transparent") {
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

/** Convert pixelData 2D array to the compact on-chain text format. */
export function pixelDataToOnchainText(pixelData: string[][], gridSize: number): string {
  const lines: string[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = pixelData[y]?.[x];
      if (color && color !== "transparent") {
        lines.push(`[${x},${y}]=${color.toUpperCase()}`);
      }
    }
  }
  return lines.join(" ");
}

/** Convert pixelData 2D array to a compact JSON string matching AIPromptGenerator's input format. */
export function pixelDataToJSON(pixelData: string[][], gridSize: number): string {
  return pixelDataToOnchainText(pixelData, gridSize).replaceAll(" ", "\n");
}

/** Parse a compact JSON string back into pixelData 2D array. */
export function jsonToPixelData(json: string, gridSize = 16): { gridSize: number; pixelData: string[][] } | null {
  try {
    const pixelData: string[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill("transparent")
    );
    const pattern = /\[(\d+),(\d+)\]\s*=\s*(#[0-9A-Fa-f]{6})/g;
    let match;
    while ((match = pattern.exec(json)) !== null) {
      const x = parseInt(match[1]);
      const y = parseInt(match[2]);
      const color = match[3].toUpperCase();
      if (y >= 0 && y < gridSize && x >= 0 && x < gridSize) {
        pixelData[y][x] = color;
      }
    }
    return { gridSize, pixelData };
  } catch {
    return null;
  }
}

/** Download a string as a file. */
export function downloadAsFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download pixelData as a PNG file. */
export function downloadAsPNG(pixelData: string[][], gridSize: number, filename = "pixel-art.png") {
  const base64 = pixelDataToPNG(pixelData, gridSize);
  if (!base64) return;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  downloadAsFileBlob(blob, filename);
}

/** Download pixelData as a compact JSON file. */
export function downloadAsJSON(pixelData: string[][], gridSize: number, filename = "pixel-art.txt") {
  const content = pixelDataToJSON(pixelData, gridSize);
  const blob = new Blob([content], { type: "text/plain" });
  downloadAsFileBlob(blob, filename);
}

function downloadAsFileBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
