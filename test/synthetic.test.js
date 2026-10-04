// test/synthetic.test.js — Stage P5b: synthetic-camera test (spec §6.7, §6.8)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PLANS } from '../src/lib/plans.js';
import { prepareFile, assembleFile } from '../src/lib/pipeline.js';
import { renderCellRgba } from '../src/lib/qrdraw.js';
import { getCropGeometry } from '../src/lib/crop.js';
import { parseDroplet } from '../src/lib/format.js';
import { Decoder } from '../src/lib/decoder.js';

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

/**
 * Creates a dark 1920x1080 RGBA frame buffer.
 */
function createDarkFrame(width = FRAME_WIDTH, height = FRAME_HEIGHT, bg = 16) {
  const frame = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < frame.length; i += 4) {
    frame[i] = bg;
    frame[i + 1] = bg;
    frame[i + 2] = bg;
    frame[i + 3] = 255;
  }
  return frame;
}

/**
 * Extracts a rectangular region from an RGBA frame buffer.
 */
function extractCellRect(frame, frameWidth, cellRect) {
  const cellData = new Uint8ClampedArray(cellRect.width * cellRect.height * 4);
  for (let y = 0; y < cellRect.height; y++) {
    const srcOffset = ((cellRect.y + y) * frameWidth + cellRect.x) * 4;
    const dstOffset = y * cellRect.width * 4;
    cellData.set(frame.subarray(srcOffset, srcOffset + cellRect.width * 4), dstOffset);
  }
  return cellData;
}

/**
 * Applies a 1-pixel box blur and +/-20 noise to an RGBA buffer.
 */
function applyBlurAndNoise(frame, width, height, startX, startY, regionW, regionH, prng) {
  const output = new Uint8ClampedArray(frame);
  const minX = Math.max(1, startX - 2);
  const maxX = Math.min(width - 2, startX + regionW + 2);
  const minY = Math.max(1, startY - 2);
  const maxY = Math.min(height - 2, startY + regionH + 2);

  // 1-pixel box blur on the region
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          rSum += frame[idx];
          gSum += frame[idx + 1];
          bSum += frame[idx + 2];
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = Math.round(rSum / 9);
      output[outIdx + 1] = Math.round(gSum / 9);
      output[outIdx + 2] = Math.round(bSum / 9);
    }
  }

  // +/- 20 uniform noise
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * width + x) * 4;
      const noise = Math.floor(prng() * 41) - 20; // [-20, 20]
      output[idx] = Math.max(0, Math.min(255, output[idx] + noise));
      output[idx + 1] = Math.max(0, Math.min(255, output[idx + 1] + noise));
      output[idx + 2] = Math.max(0, Math.min(255, output[idx + 2] + noise));
    }
  }

  return output;
}

// Simple deterministic PRNG for reproducible test runs
function makePrng(seed = 123456789) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('Stage P5b — Synthetic camera tests', () => {
  describe('Test A — Multi-plan and multi-density clean synthetic decode', () => {
    const plans = ['A', 'B', 'C'];
    const densities = [4, 6, 8];

    for (const planKey of plans) {
      const plan = PLANS[planKey];
      for (const pxPerMod of densities) {
        it(`Plan ${planKey} (${plan.gridN}×${plan.gridN}) @ ${pxPerMod} px/mod`, () => {
          const dummyData = new Uint8Array(2000);
          for (let i = 0; i < dummyData.length; i++) dummyData[i] = (i * 31 + 7) & 0xff;
          const { encoder } = prepareFile(dummyData, plan.chunkSize, 0x5a5a);

          const modulesPerCell = plan.modules + 8;
          const cellPx = modulesPerCell * pxPerMod;
          const gridPx = plan.gridN * cellPx;

          const gridX = Math.floor((FRAME_WIDTH - gridPx) / 2) + 2;
          const gridY = Math.floor((FRAME_HEIGHT - gridPx) / 2) + 2;

          const frame = createDarkFrame(FRAME_WIDTH, FRAME_HEIGHT);

          const expectedPackets = [];
          for (let r = 0; r < plan.gridN; r++) {
            for (let c = 0; c < plan.gridN; c++) {
              const pkt = encoder.next();
              expectedPackets.push(pkt);
              const qr = QRCode.create([{ data: pkt, mode: 'byte' }], { errorCorrectionLevel: 'L' });
              const cellRgba = renderCellRgba(qr.modules, cellPx, pxPerMod);
              const startX = gridX + c * cellPx;
              const startY = gridY + r * cellPx;
              for (let y = 0; y < cellPx; y++) {
                const srcOff = y * cellPx * 4;
                const dstOff = ((startY + y) * FRAME_WIDTH + startX) * 4;
                frame.set(cellRgba.subarray(srcOff, srcOff + cellPx * 4), dstOff);
              }
            }
          }

          const cropGeom = getCropGeometry(FRAME_WIDTH, FRAME_HEIGHT, plan.gridN);
          assert.equal(cropGeom.cells.length, plan.gridN * plan.gridN);

          cropGeom.cells.forEach((cellRect, idx) => {
            const cellData = extractCellRect(frame, FRAME_WIDTH, cellRect);
            const code = jsQR(cellData, cellRect.width, cellRect.height, {
              inversionAttempts: 'dontInvert'
            });

            if (!code) {
              const r = Math.floor(idx / plan.gridN);
              const c = idx % plan.gridN;
              const placedX = gridX + c * cellPx;
              const placedY = gridY + r * cellPx;
              console.error(
                `[FAILING CELL DIAGNOSTIC]\n` +
                `  Plan: ${planKey}, ${pxPerMod} px/mod, cell index: ${idx} (row ${r}, col ${c})\n` +
                `  Placed cell rectangle: [x: ${placedX}..${placedX + cellPx}, y: ${placedY}..${placedY + cellPx}] (size ${cellPx}×${cellPx})\n` +
                `  Crop window rectangle: [x: ${cellRect.x}..${cellRect.x + cellRect.width}, y: ${cellRect.y}..${cellRect.y + cellRect.height}] (size ${cellRect.width}×${cellRect.height})\n` +
                `  Grid placed at: [x: ${gridX}..${gridX + gridPx}, y: ${gridY}..${gridY + gridPx}]\n`
              );
            }

            assert.ok(
              code,
              `jsQR returned null for cell ${idx} in Plan ${planKey} @ ${pxPerMod} px/mod`
            );
            assert.ok(code.binaryData, `jsQR returned no binaryData for cell ${idx}`);

            const rawBytes = new Uint8Array(code.binaryData);
            const parsed = parseDroplet(rawBytes);
            assert.ok(parsed, `parseDroplet failed for cell ${idx}`);
            assert.deepEqual(
              Array.from(rawBytes),
              Array.from(expectedPackets[idx]),
              `Decoded packet mismatch for cell ${idx}`
            );
          });
        });
      }
    }
  });

  describe('Test B — End-to-end 20 KB round trip through synthetic camera (Plan A)', () => {
    it('pushes 3 * K droplets through render -> crop -> jsQR -> parse -> decoder', () => {
      const prng = makePrng(42);
      const original = new Uint8Array(20 * 1024);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.floor(prng() * 256);
      }

      const plan = PLANS.A;
      const { encoder, K, crc32 } = prepareFile(original, plan.chunkSize, 0xb00b);

      const pxPerMod = 8;
      const modulesPerCell = plan.modules + 8;
      const cellPx = modulesPerCell * pxPerMod;
      const gridPx = plan.gridN * cellPx;
      const gridX = Math.floor((FRAME_WIDTH - gridPx) / 2) + 2;
      const gridY = Math.floor((FRAME_HEIGHT - gridPx) / 2) + 2;

      const cropGeom = getCropGeometry(FRAME_WIDTH, FRAME_HEIGHT, plan.gridN);
      const decoder = new Decoder();

      const totalDropletsToPush = 3 * K;
      let dropletsPushed = 0;

      while (dropletsPushed < totalDropletsToPush) {
        const frame = createDarkFrame(FRAME_WIDTH, FRAME_HEIGHT);

        for (let r = 0; r < plan.gridN && dropletsPushed < totalDropletsToPush; r++) {
          for (let c = 0; c < plan.gridN && dropletsPushed < totalDropletsToPush; c++) {
            const pkt = encoder.next();
            dropletsPushed++;
            const qr = QRCode.create([{ data: pkt, mode: 'byte' }], { errorCorrectionLevel: 'L' });
            const cellRgba = renderCellRgba(qr.modules, cellPx, pxPerMod);
            const startX = gridX + c * cellPx;
            const startY = gridY + r * cellPx;
            for (let y = 0; y < cellPx; y++) {
              const srcOff = y * cellPx * 4;
              const dstOff = ((startY + y) * FRAME_WIDTH + startX) * 4;
              frame.set(cellRgba.subarray(srcOff, srcOff + cellPx * 4), dstOff);
            }
          }
        }

        // Process frame with receiver pipeline
        for (let i = 0; i < cropGeom.cells.length; i++) {
          const cellRect = cropGeom.cells[i];
          const cellData = extractCellRect(frame, FRAME_WIDTH, cellRect);
          const code = jsQR(cellData, cellRect.width, cellRect.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.binaryData) {
            decoder.add(new Uint8Array(code.binaryData));
          }
        }
      }

      assert.ok(decoder.isDone, `Decoder did not finish after ${totalDropletsToPush} droplets (rank: ${decoder.rank}/${K})`);
      const reconstructed = assembleFile(decoder);
      assert.equal(reconstructed.length, original.length);
      assert.deepEqual(Array.from(reconstructed), Array.from(original));
    });
  });

  describe('Test C (informational) — Degraded frame decode under blur and noise', () => {
    it('measures decode counts with 1-px box blur and +/-20 noise at 3, 4, 5 px/mod', () => {
      const prng = makePrng(99999);
      const plans = ['A', 'B', 'C'];
      const densities = [3, 4, 5];

      const resultsTable = [];

      for (const planKey of plans) {
        const plan = PLANS[planKey];
        for (const pxPerMod of densities) {
          const dummyData = new Uint8Array(2000);
          for (let i = 0; i < dummyData.length; i++) dummyData[i] = (i * 17 + 3) & 0xff;
          const { encoder } = prepareFile(dummyData, plan.chunkSize, 0x7c7c);

          const modulesPerCell = plan.modules + 8;
          const cellPx = modulesPerCell * pxPerMod;
          const gridPx = plan.gridN * cellPx;

          const gridX = Math.floor((FRAME_WIDTH - gridPx) / 2) + 2;
          const gridY = Math.floor((FRAME_HEIGHT - gridPx) / 2) + 2;

          let frame = createDarkFrame(FRAME_WIDTH, FRAME_HEIGHT);

          for (let r = 0; r < plan.gridN; r++) {
            for (let c = 0; c < plan.gridN; c++) {
              const pkt = encoder.next();
              const qr = QRCode.create([{ data: pkt, mode: 'byte' }], { errorCorrectionLevel: 'L' });
              const cellRgba = renderCellRgba(qr.modules, cellPx, pxPerMod);
              const startX = gridX + c * cellPx;
              const startY = gridY + r * cellPx;
              for (let y = 0; y < cellPx; y++) {
                const srcOff = y * cellPx * 4;
                const dstOff = ((startY + y) * FRAME_WIDTH + startX) * 4;
                frame.set(cellRgba.subarray(srcOff, srcOff + cellPx * 4), dstOff);
              }
            }
          }

          // Apply 1-pixel box blur and +/- 20 noise
          frame = applyBlurAndNoise(frame, FRAME_WIDTH, FRAME_HEIGHT, gridX, gridY, gridPx, gridPx, prng);

          const cropGeom = getCropGeometry(FRAME_WIDTH, FRAME_HEIGHT, plan.gridN);
          let decodedCells = 0;
          const totalCells = plan.gridN * plan.gridN;

          for (const cellRect of cropGeom.cells) {
            const cellData = extractCellRect(frame, FRAME_WIDTH, cellRect);
            const code = jsQR(cellData, cellRect.width, cellRect.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.binaryData) {
              const parsed = parseDroplet(new Uint8Array(code.binaryData));
              if (parsed) {
                decodedCells++;
              }
            }
          }

          resultsTable.push({
            plan: planKey,
            grid: `${plan.gridN}×${plan.gridN}`,
            pxPerMod,
            decoded: `${decodedCells}/${totalCells}`,
            percent: `${Math.round((decodedCells / totalCells) * 100)}%`
          });
        }
      }

      console.log('\n--- Test C (Informational): Degraded Frame Decode Table (1-px blur, ±20 noise) ---');
      console.table(resultsTable);
      console.log('----------------------------------------------------------------------------------\n');
    });
  });
});
