// test/smoke.test.js — T13: import smoke test for pako, qrcode, jsqr
// Verifies the three runtime libraries can be imported and called without error.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as pako from 'pako';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

describe('T13 — library smoke test', () => {
  it('pako: deflate/inflate round-trips a small buffer', () => {
    const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const compressed = pako.deflate(input);
    const decompressed = pako.inflate(compressed);
    assert.deepStrictEqual(decompressed, input);
  });

  it('qrcode: QRCode.create produces a module matrix for short bytes', () => {
    // byte mode, ECC L — same call style as spec §6.7
    const qr = QRCode.create([{ data: new Uint8Array([0x41, 0x42]), mode: 'byte' }], {
      errorCorrectionLevel: 'L'
    });
    assert.ok(qr.modules.size > 0, 'modules.size should be positive');
    assert.ok(qr.modules.data instanceof Uint8Array, 'modules.data should be a Uint8Array');
    assert.strictEqual(qr.modules.data.length, qr.modules.size * qr.modules.size);
  });

  it('jsQR: returns null on a tiny blank (all-white) image', () => {
    // 4×4 RGBA white image — no QR code, so jsQR must return null
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const result = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    assert.strictEqual(result, null);
  });
});
