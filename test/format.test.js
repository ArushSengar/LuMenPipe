// test/format.test.js — T1, T1b, T2 wire format tests

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  crc32,
  packHeader,
  unpackHeader,
  packDroplet,
  parseDroplet,
  splitChunks,
  joinChunks
} from '../src/lib/format.js';

describe('T1b — CRC32 verification', () => {
  it('computes CRC32 of ASCII "123456789" as 0xCBF43926', () => {
    const input = '123456789';
    const result = crc32(input);
    assert.equal(result, 0xCBF43926);
  });

  it('computes CRC32 of Uint8Array representation', () => {
    const bytes = new TextEncoder().encode('123456789');
    const result = crc32(bytes);
    assert.equal(result, 0xCBF43926);
  });
});

describe('T1 — Header packing and parsing', () => {
  it('packs known-answer header to exact 16 bytes', () => {
    const header = {
      sid: 0x1234,
      K: 200,
      seed: 0xDEADBEEF >>> 0,
      compressedLen: 48000,
      crc32: 0xCBF43926
    };

    const packed = packHeader(header);
    const expected = new Uint8Array([
      0x34, 0x12, 0xc8, 0x00, 0xef, 0xbe, 0xad, 0xde,
      0x80, 0xbb, 0x00, 0x00, 0x26, 0x39, 0xf4, 0xcb
    ]);

    assert.equal(packed.length, 16);
    assert.deepEqual(Array.from(packed), Array.from(expected));

    const unpacked = unpackHeader(packed);
    assert.equal(unpacked.sid, 0x1234);
    assert.equal(unpacked.K, 200);
    assert.equal(unpacked.seed, 0xDEADBEEF >>> 0);
    assert.equal(unpacked.compressedLen, 48000);
    assert.equal(unpacked.crc32, 0xCBF43926);
  });

  it('round-trips 1000 random header values', () => {
    for (let i = 0; i < 1000; i++) {
      const sid = Math.floor(Math.random() * 0x10000);
      const K = Math.floor(Math.random() * 65535) + 1;
      const seed = (Math.random() * 0x100000000) >>> 0;
      const compressedLen = (Math.random() * 1000000) >>> 0;
      const crc = (Math.random() * 0x100000000) >>> 0;

      const header = { sid, K, seed, compressedLen, crc32: crc };
      const packed = packHeader(header);
      const unpacked = unpackHeader(packed);

      assert.equal(unpacked.sid, sid);
      assert.equal(unpacked.K, K);
      assert.equal(unpacked.seed, seed);
      assert.equal(unpacked.compressedLen, compressedLen);
      assert.equal(unpacked.crc32, crc);
    }
  });
});

describe('packDroplet and parseDroplet', () => {
  it('packs and parses valid droplet with payload', () => {
    const header = {
      sid: 0x1234,
      K: 200,
      seed: 0xDEADBEEF >>> 0,
      compressedLen: 48000,
      crc32: 0xCBF43926
    };
    const payload = new Uint8Array(240);
    payload.fill(0x42);

    const droplet = packDroplet(header, payload);
    assert.equal(droplet.length, 16 + 240);

    const parsed = parseDroplet(droplet);
    assert.notEqual(parsed, null);
    assert.equal(parsed.sid, 0x1234);
    assert.equal(parsed.K, 200);
    assert.equal(parsed.seed, 0xDEADBEEF >>> 0);
    assert.equal(parsed.compressedLen, 48000);
    assert.equal(parsed.crc32, 0xCBF43926);
    assert.equal(parsed.chunkSize, 240);
    assert.deepEqual(Array.from(parsed.payload), Array.from(payload));
  });

  describe('Negative validity tests for parseDroplet', () => {
    const validHeader = {
      sid: 0x1234,
      K: 10,
      seed: 12345,
      compressedLen: 2400,
      crc32: 0x12345678
    };
    const validPayload = new Uint8Array(240);

    it('returns null if packet is shorter than 17 bytes', () => {
      const shortPacket = new Uint8Array(16);
      assert.equal(parseDroplet(shortPacket), null);

      const empty = new Uint8Array(0);
      assert.equal(parseDroplet(empty), null);

      const tiny = new Uint8Array(10);
      assert.equal(parseDroplet(tiny), null);
    });

    it('returns null if (length - 16) is not a multiple of 4', () => {
      // 16 + 5 = 21 bytes
      const badLenPayload = new Uint8Array(5);
      const badPacket = packDroplet(validHeader, badLenPayload);
      assert.equal(parseDroplet(badPacket), null);

      // 16 + 1 = 17 bytes (17 >= 17, but (17-16)%4 == 1)
      const badPacket17 = packDroplet(validHeader, new Uint8Array(1));
      assert.equal(parseDroplet(badPacket17), null);
    });

    it('returns null if K = 0', () => {
      const zeroKHeader = { ...validHeader, K: 0 };
      const packet = packDroplet(zeroKHeader, validPayload);
      assert.equal(parseDroplet(packet), null);
    });

    it('returns null if compressedLen > K * chunkSize', () => {
      // K = 10, chunkSize = 240 => max = 2400
      const tooLargeHeader = { ...validHeader, K: 10, compressedLen: 2401 };
      const packet = packDroplet(tooLargeHeader, validPayload);
      assert.equal(parseDroplet(packet), null);
    });

    it('returns null if compressedLen <= (K - 1) * chunkSize', () => {
      // K = 10, chunkSize = 240 => (K-1)*240 = 2160
      const tooSmallHeader = { ...validHeader, K: 10, compressedLen: 2160 };
      const packet = packDroplet(tooSmallHeader, validPayload);
      assert.equal(parseDroplet(packet), null);

      const wayTooSmallHeader = { ...validHeader, K: 10, compressedLen: 100 };
      const packet2 = packDroplet(wayTooSmallHeader, validPayload);
      assert.equal(parseDroplet(packet2), null);
    });
  });
});

describe('T2 — splitChunks and joinChunks', () => {
  const chunkSize = 240;
  const testLengths = [1, 2, 239, 240, 241, 5000];

  for (const len of testLengths) {
    it(`splits and joins byte-exact for length ${len} with chunkSize ${chunkSize}`, () => {
      const original = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        original[i] = (i * 37 + 13) & 0xFF;
      }

      const { K, chunks } = splitChunks(original, chunkSize);
      const expectedK = Math.ceil(len / chunkSize);
      assert.equal(K, expectedK);
      assert.equal(chunks.length, expectedK);

      // Verify every chunk has exact chunkSize
      for (let i = 0; i < chunks.length; i++) {
        assert.equal(chunks[i].length, chunkSize);
      }

      // Verify zero-padding in the last chunk
      const remainder = len % chunkSize;
      if (remainder !== 0) {
        const lastChunk = chunks[chunks.length - 1];
        for (let j = remainder; j < chunkSize; j++) {
          assert.equal(lastChunk[j], 0, `Expected zero at padding index ${j}`);
        }
      }

      // Verify joinChunks truncates exactly to original length
      const joined = joinChunks(chunks, len);
      assert.equal(joined.length, len);
      assert.deepEqual(Array.from(joined), Array.from(original));
    });
  }

  it('works with chunkSize = 160 (Plan B)', () => {
    const original = new Uint8Array(350);
    original.fill(0xAB);
    const { K, chunks } = splitChunks(original, 160);
    assert.equal(K, Math.ceil(350 / 160)); // 3
    assert.equal(chunks.length, 3);
    const joined = joinChunks(chunks, 350);
    assert.deepEqual(Array.from(joined), Array.from(original));
  });
});
