// src/lib/pipeline.js — prepareFile and assembleFile (spec §6.9, prompt P4)

import * as pako from 'pako';
import { crc32 } from './format.js';
import { Encoder } from './encoder.js';

export class PipelineError extends Error {
  /**
   * @param {'inflate failed'|'crc mismatch'|string} reason
   * @param {Error|null} [cause=null]
   */
  constructor(reason, cause = null) {
    super(reason);
    this.name = 'PipelineError';
    this.reason = reason;
    this.cause = cause;
  }
}

/**
 * Prepares an uncompressed file buffer for optical transmission:
 * Computes original CRC32, deflates with pako, and initializes the LT fountain encoder.
 * @param {Uint8Array|ArrayBuffer} bytes Original uncompressed bytes
 * @param {number} chunkSize Multiple of 4 (e.g. 160 or 240)
 * @param {number} sid Random session ID
 * @returns {{ encoder: Encoder, K: number, originalSize: number, compressedSize: number, crc32: number }}
 */
export function prepareFile(bytes, chunkSize, sid) {
  const originalBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const originalCrc = crc32(originalBytes);
  const compressed = pako.deflate(originalBytes);
  const encoder = new Encoder(compressed, chunkSize, sid, originalCrc);

  return {
    encoder,
    K: encoder.K,
    originalSize: originalBytes.length,
    compressedSize: compressed.length,
    crc32: originalCrc
  };
}

/**
 * Assembles and verifies the received file from a completed Decoder:
 * Inflates compressed bytes and asserts CRC32 matches the header value.
 * Throws a PipelineError with reason 'inflate failed' or 'crc mismatch' on corruption.
 * @param {import('./decoder.js').Decoder} decoder
 * @returns {Uint8Array} Original uncompressed bytes
 */
export function assembleFile(decoder) {
  if (!decoder || !decoder.isDone) {
    throw new PipelineError('decoder not complete');
  }

  const compressed = decoder.getDecodedBytes();
  if (!compressed) {
    throw new PipelineError('inflate failed');
  }

  let uncompressed;
  try {
    uncompressed = pako.inflate(compressed);
  } catch (err) {
    throw new PipelineError('inflate failed', err);
  }

  const computedCrc = crc32(uncompressed);
  if (computedCrc !== decoder.crc32) {
    throw new PipelineError('crc mismatch');
  }

  return uncompressed;
}
