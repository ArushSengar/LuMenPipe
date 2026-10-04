// src/lib/format.js — wire format: CRC32, header pack/unpack, droplet pack/parse, chunking

// Standard IEEE 802.3 CRC-32 lookup table (polynomial 0xEDB88320)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

/**
 * Standard IEEE 802.3 CRC-32 checksum.
 * @param {Uint8Array|string} data
 * @returns {number} 32-bit unsigned integer
 */
export function crc32(data) {
  let crc = 0xFFFFFFFF;
  let bytes;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    bytes = new Uint8Array(data);
  }

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Packs a 16-byte little-endian header per spec §4.
 * Offset 0:  u16 sid
 * Offset 2:  u16 K
 * Offset 4:  u32 seed
 * Offset 8:  u32 compressedLen
 * Offset 12: u32 crc32
 * @param {{ sid: number, K: number, seed: number, compressedLen: number, crc32: number }} header
 * @returns {Uint8Array} 16 bytes
 */
export function packHeader({ sid, K, seed, compressedLen, crc32 }) {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  view.setUint16(0, sid, true);
  view.setUint16(2, K, true);
  view.setUint32(4, seed, true);
  view.setUint32(8, compressedLen, true);
  view.setUint32(12, crc32, true);
  return new Uint8Array(buffer);
}

/**
 * Unpacks a 16-byte little-endian header per spec §4.
 * @param {Uint8Array} bytes
 * @returns {{ sid: number, K: number, seed: number, compressedLen: number, crc32: number }}
 */
export function unpackHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, 16);
  return {
    sid: view.getUint16(0, true),
    K: view.getUint16(2, true),
    seed: view.getUint32(4, true),
    compressedLen: view.getUint32(8, true),
    crc32: view.getUint32(12, true)
  };
}

/**
 * Packs a droplet: 16-byte header + payload bytes.
 * @param {{ sid: number, K: number, seed: number, compressedLen: number, crc32: number }|Uint8Array} header
 * @param {Uint8Array} payload
 * @returns {Uint8Array}
 */
export function packDroplet(header, payload) {
  const headerBytes = header instanceof Uint8Array ? header : packHeader(header);
  const droplet = new Uint8Array(16 + payload.length);
  droplet.set(headerBytes, 0);
  droplet.set(payload, 16);
  return droplet;
}

/**
 * Parses and validates a received droplet packet per spec §4.
 * Validity checks:
 * 1. total length >= 17
 * 2. (length - 16) % 4 == 0
 * 3. K >= 1
 * 4. compressedLen <= K * chunkSize
 * 5. compressedLen > (K - 1) * chunkSize
 * Returns null if any check fails.
 * @param {Uint8Array} packet
 * @returns {{ sid: number, K: number, seed: number, compressedLen: number, crc32: number, chunkSize: number, payload: Uint8Array }|null}
 */
export function parseDroplet(packet) {
  if (!packet || !(packet instanceof Uint8Array || ArrayBuffer.isView(packet))) {
    return null;
  }
  const len = packet.byteLength;
  if (len < 17) return null;
  if ((len - 16) % 4 !== 0) return null;

  const header = unpackHeader(packet);
  const chunkSize = len - 16;

  if (header.K < 1) return null;
  if (header.compressedLen > header.K * chunkSize) return null;
  if (header.compressedLen <= (header.K - 1) * chunkSize) return null;

  const payload = new Uint8Array(
    packet.buffer,
    packet.byteOffset + 16,
    chunkSize
  );

  return {
    ...header,
    chunkSize,
    payload
  };
}

/**
 * Splits bytes into K chunks of chunkSize, zero-padding the last chunk per spec §4.
 * @param {Uint8Array} bytes
 * @param {number} chunkSize
 * @returns {{ K: number, chunks: Uint8Array[] }}
 */
export function splitChunks(bytes, chunkSize) {
  const K = Math.max(1, Math.ceil(bytes.length / chunkSize));
  const chunks = new Array(K);

  for (let i = 0; i < K; i++) {
    const chunk = new Uint8Array(chunkSize);
    const start = i * chunkSize;
    const end = Math.min(bytes.length, start + chunkSize);
    if (start < bytes.length) {
      chunk.set(bytes.subarray(start, end), 0);
    }
    chunks[i] = chunk;
  }

  return { K, chunks };
}

/**
 * Joins K chunks and truncates exactly to compressedLen.
 * @param {Uint8Array[]} chunks
 * @param {number} compressedLen
 * @returns {Uint8Array}
 */
export function joinChunks(chunks, compressedLen) {
  const result = new Uint8Array(compressedLen);
  let offset = 0;
  for (let i = 0; i < chunks.length && offset < compressedLen; i++) {
    const chunk = chunks[i];
    const toCopy = Math.min(chunk.length, compressedLen - offset);
    result.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
  }
  return result;
}
