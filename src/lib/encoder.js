// src/lib/encoder.js — LT fountain code encoder (spec §6.5)

import { splitChunks, packDroplet } from './format.js';
import { getDropletIndices } from './lt.js';

export class Encoder {
  /**
   * Constructs an LT fountain code encoder.
   * @param {Uint8Array|{ bytes: Uint8Array, chunkSize: number, sid: number, crc32?: number, seedSource?: () => number }} bytesOrOptions
   * @param {number} [chunkSize] Multiple of 4
   * @param {number} [sid] Session ID (u16)
   * @param {number} [crc32=0] Original file CRC-32 (u32)
   * @param {(() => number)|null} [seedSource=null] Optional seed generator for deterministic tests
   */
  constructor(bytesOrOptions, chunkSize, sid, crc32 = 0, seedSource = null) {
    let bytes;
    if (bytesOrOptions && !(bytesOrOptions instanceof Uint8Array) && typeof bytesOrOptions === 'object') {
      bytes = bytesOrOptions.bytes;
      chunkSize = bytesOrOptions.chunkSize;
      sid = bytesOrOptions.sid;
      crc32 = bytesOrOptions.crc32 ?? 0;
      seedSource = bytesOrOptions.seedSource ?? null;
    } else {
      bytes = bytesOrOptions;
    }

    if (!bytes || !(bytes instanceof Uint8Array)) {
      bytes = new Uint8Array(bytes || 0);
    }
    if ((chunkSize % 4) !== 0 || chunkSize < 4) {
      throw new Error(`chunkSize must be a positive multiple of 4, got ${chunkSize}`);
    }

    this.compressedLen = bytes.length;
    this.chunkSize = chunkSize;
    this.wordsPerChunk = chunkSize >>> 2;
    this.sid = sid & 0xFFFF;
    this.crc32 = crc32 >>> 0;
    this.seedSource = seedSource;

    const { K, chunks } = splitChunks(bytes, chunkSize);
    this.K = K;

    // Convert each chunk to an aligned Uint32Array for fast word-wise XOR
    this.chunksU32 = new Array(K);
    for (let i = 0; i < K; i++) {
      const aligned = new ArrayBuffer(chunkSize);
      const u8 = new Uint8Array(aligned);
      u8.set(chunks[i]);
      this.chunksU32[i] = new Uint32Array(aligned);
    }
  }

  /**
   * Generates and returns the next fountain droplet packet (16-byte header + payload).
   * @returns {Uint8Array}
   */
  next() {
    let seed;
    if (typeof this.seedSource === 'function') {
      seed = (this.seedSource() >>> 0);
    } else {
      const buf = new Uint32Array(1);
      globalThis.crypto.getRandomValues(buf);
      seed = buf[0] >>> 0;
    }

    const indices = getDropletIndices(seed, this.K);
    const payloadBuffer = new ArrayBuffer(this.chunkSize);
    const payloadU32 = new Uint32Array(payloadBuffer);

    for (let i = 0; i < indices.length; i++) {
      const chunkWords = this.chunksU32[indices[i]];
      for (let w = 0; w < this.wordsPerChunk; w++) {
        payloadU32[w] ^= chunkWords[w];
      }
    }

    const payloadBytes = new Uint8Array(payloadBuffer);
    return packDroplet({
      sid: this.sid,
      K: this.K,
      seed,
      compressedLen: this.compressedLen,
      crc32: this.crc32
    }, payloadBytes);
  }
}
