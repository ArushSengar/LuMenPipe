// src/lib/qrdraw.js — pure QR layout geometry and module drawing (spec §6.7, prompt P5, P5b)

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
 * Pure function: renders a QR code module matrix into an RGBA pixel buffer.
 * Background is pure white (including 4-module quiet zone on all sides).
 * Modules are drawn at integer devicePxPerModule pixels.
 *
 * @param {{ size: number, data: Uint8Array }} qrModules Result from QRCode.create(...).modules
 * @param {number} cellDevicePx Full cell size in device pixels
 * @param {number} devicePxPerModule Integer device pixels per module
 * @returns {Uint8ClampedArray} RGBA buffer (length = cellDevicePx * cellDevicePx * 4)
 */
export function renderCellRgba(qrModules, cellDevicePx, devicePxPerModule) {
  const buffer = new Uint8ClampedArray(cellDevicePx * cellDevicePx * 4);
  buffer.fill(255); // Initialize all pixels to pure white RGBA(255, 255, 255, 255)

  const size = qrModules.size;
  const data = qrModules.data;
  const quietZonePx = devicePxPerModule * 4;

  for (let r = 0; r < size; r++) {
    const startY = quietZonePx + r * devicePxPerModule;
    const rowOffset = r * size;
    for (let c = 0; c < size; c++) {
      if (data[rowOffset + c]) {
        const startX = quietZonePx + c * devicePxPerModule;
        for (let y = startY; y < startY + devicePxPerModule; y++) {
          let offset = (y * cellDevicePx + startX) * 4;
          for (let x = 0; x < devicePxPerModule; x++) {
            buffer[offset] = 0;
            buffer[offset + 1] = 0;
            buffer[offset + 2] = 0;
            buffer[offset + 3] = 255;
            offset += 4;
          }
        }
      }
    }
  }

  return buffer;
}

/**
 * Draws one QR code's module matrix onto a canvas context by rendering
 * to an RGBA buffer and copying it.
 *
 * @param {CanvasRenderingContext2D} ctx 2D canvas context
 * @param {{ size: number, data: Uint8Array }} qrModules Result from QRCode.create(...).modules
 * @param {number} cellX Device pixel X position of cell top-left
 * @param {number} cellY Device pixel Y position of cell top-left
 * @param {number} cellDevicePx Full cell size in device pixels (including quiet zone)
 * @param {number} devicePxPerModule Integer device pixels per module
 */
export function drawCellToContext(ctx, qrModules, cellX, cellY, cellDevicePx, devicePxPerModule) {
  const rgba = renderCellRgba(qrModules, cellDevicePx, devicePxPerModule);
  if (typeof ImageData !== 'undefined') {
    const imgData = new ImageData(rgba, cellDevicePx, cellDevicePx);
    ctx.putImageData(imgData, cellX, cellY);
  } else {
    // Fallback if ImageData is unavailable
    const quietZonePx = devicePxPerModule * 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cellX, cellY, cellDevicePx, cellDevicePx);
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
}
