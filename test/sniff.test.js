// test/sniff.test.js — Magic byte detection tests (spec §6.9, prompt P8)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sniffFileType } from '../src/lib/sniff.js';

describe('P8 — sniffFileType magic byte detection', () => {
  it('detects PNG (89 50 4E 47)', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const res = sniffFileType(pngBytes);
    assert.equal(res.ext, 'png');
    assert.equal(res.mime, 'image/png');
    assert.equal(res.isImage, true);
  });

  it('detects JPEG (FF D8 FF)', () => {
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const res = sniffFileType(jpegBytes);
    assert.equal(res.ext, 'jpg');
    assert.equal(res.mime, 'image/jpeg');
    assert.equal(res.isImage, true);
  });

  it('detects PDF (25 50 44 46)', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]);
    const res = sniffFileType(pdfBytes);
    assert.equal(res.ext, 'pdf');
    assert.equal(res.mime, 'application/pdf');
    assert.equal(res.isImage, false);
  });

  it('detects ZIP (50 4B 03 04)', () => {
    const zipBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    const res = sniffFileType(zipBytes);
    assert.equal(res.ext, 'zip');
    assert.equal(res.mime, 'application/zip');
    assert.equal(res.isImage, false);
  });

  it('detects GIF (47 49 46 38)', () => {
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const res = sniffFileType(gifBytes);
    assert.equal(res.ext, 'gif');
    assert.equal(res.mime, 'image/gif');
    assert.equal(res.isImage, true);
  });

  it('falls back to bin for unknown binary type', () => {
    const unknownBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
    const res = sniffFileType(unknownBytes);
    assert.equal(res.ext, 'bin');
    assert.equal(res.mime, 'application/octet-stream');
    assert.equal(res.isImage, false);
  });

  it('handles empty array gracefully', () => {
    const emptyBytes = new Uint8Array(0);
    const res = sniffFileType(emptyBytes);
    assert.equal(res.ext, 'bin');
    assert.equal(res.mime, 'application/octet-stream');
    assert.equal(res.isImage, false);
  });
});
