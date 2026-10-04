// test/crop.test.js — Crop and cell rectangle geometry tests (prompt P6)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCropGeometry } from '../src/lib/crop.js';

describe('P6 — Crop geometry tests', () => {
  const resolutions = [
    { width: 1920, height: 1080, name: '1080p landscape' },
    { width: 1280, height: 720, name: '720p landscape' },
    { width: 1080, height: 1920, name: '1080p portrait' }
  ];

  const gridNs = [1, 2, 3];
  const paddingFraction = 0.12;

  for (const res of resolutions) {
    describe(`${res.name} (${res.width}×${res.height})`, () => {
      for (const N of gridNs) {
        it(`N = ${N}, padding ${paddingFraction}: rectangles inside frame and square`, () => {
          const { centralSquare, cells } = getCropGeometry(res.width, res.height, N, paddingFraction);

          // Central square inside frame and square
          assert.equal(centralSquare.width, centralSquare.height);
          assert.ok(centralSquare.x >= 0);
          assert.ok(centralSquare.y >= 0);
          assert.ok(centralSquare.x + centralSquare.width <= res.width);
          assert.ok(centralSquare.y + centralSquare.height <= res.height);

          // Correct number of cells
          assert.equal(cells.length, N * N);

          // Every cell inside frame and square
          for (const cell of cells) {
            assert.equal(cell.width, cell.height, `Cell width (${cell.width}) != height (${cell.height})`);
            assert.ok(cell.x >= 0, `Cell x (${cell.x}) < 0`);
            assert.ok(cell.y >= 0, `Cell y (${cell.y}) < 0`);
            assert.ok(
              cell.x + cell.width <= res.width,
              `Cell right (${cell.x + cell.width}) > width (${res.width})`
            );
            assert.ok(
              cell.y + cell.height <= res.height,
              `Cell bottom (${cell.y + cell.height}) > height (${res.height})`
            );
          }

          // If N = 2, verify cells overlap each other only through the padding
          if (N === 2) {
            const cell00 = cells[0]; // r=0, c=0
            const cell01 = cells[1]; // r=0, c=1
            const cell10 = cells[2]; // r=1, c=0

            // With padding > 0, adjacent cells overlap
            const hOverlap = (cell00.x + cell00.width) - cell01.x;
            const vOverlap = (cell00.y + cell00.height) - cell10.y;
            assert.ok(hOverlap > 0, 'Adjacent cells must overlap horizontally due to padding');
            assert.ok(vOverlap > 0, 'Adjacent cells must overlap vertically due to padding');

            // Without padding (paddingFraction = 0), cells do not overlap
            const unpadded = getCropGeometry(res.width, res.height, 2, 0);
            const u00 = unpadded.cells[0];
            const u01 = unpadded.cells[1];
            const u10 = unpadded.cells[2];
            const uHOverlap = (u00.x + u00.width) - u01.x;
            const uVOverlap = (u00.y + u00.height) - u10.y;
            assert.equal(uHOverlap, 0, 'Unpadded cells must not overlap horizontally');
            assert.equal(uVOverlap, 0, 'Unpadded cells must not overlap vertically');
          }
        });
      }
    });
  }
});
