// src/lib/crop.js — central square and cell rectangle geometry for receiver (spec §6.8, prompt P6)

/**
 * Calculates central square and N x N padded cell rectangles inside a video frame.
 * @param {number} videoWidth Delivered video width in pixels
 * @param {number} videoHeight Delivered video height in pixels
 * @param {number} gridN Grid dimension N (e.g. 1 or 2)
 * @param {number} [paddingFraction=0.12] Additional margin on each side of a cell
 * @returns {{
 *   centralSquare: { x: number, y: number, width: number, height: number },
 *   cells: Array<{ x: number, y: number, width: number, height: number, row: number, col: number }>
 * }}
 */
export function getCropGeometry(videoWidth, videoHeight, gridN, paddingFraction = 0.12) {
  const squareSide = Math.min(videoWidth, videoHeight);
  const squareX = Math.floor((videoWidth - squareSide) / 2);
  const squareY = Math.floor((videoHeight - squareSide) / 2);
  const centralSquare = {
    x: squareX,
    y: squareY,
    width: squareSide,
    height: squareSide
  };

  const baseCellSide = squareSide / gridN;
  const pad = Math.round(baseCellSide * paddingFraction);
  // Padded cell side, clamped so it cannot exceed the frame bounds
  const cellSide = Math.min(Math.min(videoWidth, videoHeight), Math.round(baseCellSide + 2 * pad));

  const cells = [];
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      const centerX = squareX + (c + 0.5) * baseCellSide;
      const centerY = squareY + (r + 0.5) * baseCellSide;

      const idealX = Math.round(centerX - cellSide / 2);
      const idealY = Math.round(centerY - cellSide / 2);

      const x = Math.max(0, Math.min(videoWidth - cellSide, idealX));
      const y = Math.max(0, Math.min(videoHeight - cellSide, idealY));

      cells.push({
        x,
        y,
        width: cellSide,
        height: cellSide,
        row: r,
        col: c
      });
    }
  }

  return { centralSquare, cells };
}
