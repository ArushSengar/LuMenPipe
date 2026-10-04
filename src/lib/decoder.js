// src/lib/decoder.js — incremental GF(2) elimination decoder (spec §6.6)

import { parseDroplet } from './format.js';
import { getDropletIndices } from './lt.js';

export class Decoder {
  constructor() {
    this.reset();
  }

  /**
   * Resets the decoder state to initial empty values.
   */
  reset() {
    this.sid = null;
    this.K = 0;
    this.chunkSize = 0;
    this.compressedLen = 0;
    this.crc32 = 0;
    this.rank = 0;
    this.acceptedCount = 0;
    this.dependentCount = 0;
    this.isDone = false;
    this.decodedBytes = null;

    this.maskWords = 0;
    this.payloadWords = 0;
    this.pivots = null;
    this.pivotPayloads = null;
  }

  /**
   * Initializes internal data structures for a stream.
   */
  init(sid, K, chunkSize, compressedLen, crc32) {
    this.sid = sid;
    this.K = K;
    this.chunkSize = chunkSize;
    this.compressedLen = compressedLen;
    this.crc32 = crc32;
    this.rank = 0;
    this.acceptedCount = 0;
    this.dependentCount = 0;
    this.isDone = false;
    this.decodedBytes = null;

    this.maskWords = Math.ceil(K / 32);
    this.payloadWords = chunkSize >>> 2;
    this.pivots = new Array(K).fill(null);
    this.pivotPayloads = new Array(K).fill(null);
  }

  /**
   * Processes an incoming droplet packet.
   * @param {Uint8Array} packet Raw packet bytes
   * @returns {'innovative'|'dependent'|'foreign'|'bad'|'done'}
   */
  add(packet) {
    const parsed = parseDroplet(packet);
    if (!parsed) {
      return 'bad';
    }

    if (this.sid === null) {
      this.init(parsed.sid, parsed.K, parsed.chunkSize, parsed.compressedLen, parsed.crc32);
    } else if (parsed.sid !== this.sid) {
      // Changed sid resets the decoder per spec §6.6
      this.reset();
      return 'foreign';
    } else if (parsed.K !== this.K || parsed.chunkSize !== this.chunkSize || parsed.compressedLen !== this.compressedLen) {
      return 'foreign';
    }

    if (this.isDone) {
      return 'done';
    }

    // Build row equation from seed: bitmask over K unknowns + payload words
    const indices = getDropletIndices(parsed.seed, this.K);
    const mask = new Uint32Array(this.maskWords);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      mask[idx >>> 5] ^= (1 << (idx & 31));
    }

    const rowPayload = new Uint32Array(this.payloadWords);
    new Uint8Array(rowPayload.buffer).set(parsed.payload);

    // Incremental GF(2) reduction against pivot table
    while (true) {
      // Find lowest set bit in mask
      let pivot = -1;
      for (let w = 0; w < this.maskWords; w++) {
        const val = mask[w];
        if (val !== 0) {
          const bit = 31 - Math.clz32(val & -val);
          pivot = (w << 5) + bit;
          break;
        }
      }

      if (pivot === -1) {
        // Linearly dependent droplet
        this.dependentCount++;
        return 'dependent';
      }

      if (this.pivots[pivot] === null) {
        // Innovative droplet: becomes pivot for this bit
        this.pivots[pivot] = mask;
        this.pivotPayloads[pivot] = rowPayload;
        this.rank++;
        this.acceptedCount++;
        break;
      } else {
        // Eliminate lowest bit using existing pivot row
        const pivMask = this.pivots[pivot];
        const pivPayload = this.pivotPayloads[pivot];
        for (let w = 0; w < this.maskWords; w++) {
          mask[w] ^= pivMask[w];
        }
        for (let w = 0; w < this.payloadWords; w++) {
          rowPayload[w] ^= pivPayload[w];
        }
      }
    }

    // If rank reaches K, solve the system and finish
    if (this.rank === this.K) {
      this._backSubstituteAndAssemble();
      this.isDone = true;
      return 'done';
    }

    return 'innovative';
  }

  /**
   * Back-substitutes from the highest pivot down so each row isolates one chunk,
   * then concatenates chunks in index order and truncates to compressedLen.
   * @private
   */
  _backSubstituteAndAssemble() {
    for (let i = this.K - 1; i >= 0; i--) {
      const word = i >>> 5;
      const bit = 1 << (i & 31);
      const pI = this.pivotPayloads[i];

      for (let j = i - 1; j >= 0; j--) {
        if ((this.pivots[j][word] & bit) !== 0) {
          this.pivots[j][word] ^= bit;
          const pJ = this.pivotPayloads[j];
          for (let w = 0; w < this.payloadWords; w++) {
            pJ[w] ^= pI[w];
          }
        }
      }
    }

    const assembled = new Uint8Array(this.compressedLen);
    let offset = 0;
    for (let i = 0; i < this.K && offset < this.compressedLen; i++) {
      const chunkBytes = new Uint8Array(
        this.pivotPayloads[i].buffer,
        this.pivotPayloads[i].byteOffset,
        this.chunkSize
      );
      const toCopy = Math.min(this.chunkSize, this.compressedLen - offset);
      assembled.set(chunkBytes.subarray(0, toCopy), offset);
      offset += toCopy;
    }

    this.decodedBytes = assembled;
  }

  /**
   * Returns the assembled compressed bytes, truncated to compressedLen.
   * @returns {Uint8Array|null}
   */
  getDecodedBytes() {
    return this.decodedBytes;
  }
}
