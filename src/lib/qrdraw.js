// src/lib/qrdraw.js — pure QR layout geometry and module drawing (spec §6.7, prompt P5)

/**
 * Calculates integer pixel layout geometry for the QR grid.
 * Ensures an exact integer number of device pixels per module so that
 * pixels align sharply without antialiasing artifacts at all display scalings.
 *
 * @param {{ gridN: number, modules: number }} plan
 * @param {number} availableSquareDevicePx Available square dimension in device pixels
 * @param {number} [dpr=1] Window devicePixelRatio
 * @returns {{
 *   devicePxPerModule: number,
 *   gridDevicePx: number,
 *   cssSize: number,
 *   cellDevicePx: number,
 *   quietZoneDevicePx: number,
 *   modulesPerCell: number,
 *   totalModules: number
 * }}
 */
export function calculateGridLayout(plan, availableSquareDevicePx, dpr = 1) {
  const modulesPerCell = plan.modules + 8; // 4-module quiet zone on each side
  const totalModules = plan.gridN * modulesPerCell;

  const devicePxPerModule = Math.max(1, Math.floor(availableSquareDevicePx / totalModules));
  const gridDevicePx = devicePxPerModule * totalModules;
  const cssSize = gridDevicePx / dpr;
  const cellDevicePx = devicePxPerModule * modulesPerCell;
  const quietZoneDevicePx = devicePxPerModule * 4;

  return {
    devicePxPerModule,
    gridDevicePx,
    cssSize,
    cellDevicePx,
    quietZoneDevicePx,
    modulesPerCell,
    totalModules
  };
}

/**
 * Draws one QR code's module matrix directly onto a canvas context at integer device pixels.
 * Modules are drawn inside the cell's quiet zone (4 modules inset on all sides).
 * Background of the cell is filled with pure white.
 *
 * @param {CanvasRenderingContext2D} ctx 2D canvas context
 * @param {{ size: number, data: Uint8Array }} qrModules Result from QRCode.create(...).modules
 * @param {number} cellX Device pixel X position of cell top-left
 * @param {number} cellY Device pixel Y position of cell top-left
 * @param {number} cellDevicePx Full cell size in device pixels (including quiet zone)
 * @param {number} devicePxPerModule Integer device pixels per module
 */
export function drawCellToContext(ctx, qrModules, cellX, cellY, cellDevicePx, devicePxPerModule) {
  const quietZonePx = devicePxPerModule * 4;

  // Clear/fill cell with pure white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cellX, cellY, cellDevicePx, cellDevicePx);

  // Draw dark modules in pure black
  ctx.fillStyle = '#000000';
  const size = qrModules.size;
  const data = qrModules.data;

  for (let r = 0; r < size; r++) {
    const modY = cellY + quietZonePx + r * devicePxPerModule;
    const rowOffset = r * size;
    for (let c = 0; c < size; c++) {
      if (data[rowOffset + c]) {
        const modX = cellX + quietZonePx + c * devicePxPerModule;
        ctx.fillRect(modX, modY, devicePxPerModule, devicePxPerModule);
      }
    }
  }
}
