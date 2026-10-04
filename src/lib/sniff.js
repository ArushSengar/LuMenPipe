// src/lib/sniff.js — file type detection by magic bytes (spec §6.9, prompt P8)

/**
 * Sniffs the MIME type, file extension, and image status from magic bytes.
 * @param {Uint8Array} bytes
 * @returns {{ ext: string, mime: string, isImage: boolean }}
 */
export function sniffFileType(bytes) {
  if (!bytes || bytes.length < 3) {
    return { ext: 'bin', mime: 'application/octet-stream', isImage: false };
  }

  // PNG: 89 50 4E 47
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47
  ) {
    return { ext: 'png', mime: 'image/png', isImage: true };
  }

  // JPEG: FF D8 FF
  if (
    bytes[0] === 0xFF &&
    bytes[1] === 0xD8 &&
    bytes[2] === 0xFF
  ) {
    return { ext: 'jpg', mime: 'image/jpeg', isImage: true };
  }

  // PDF: 25 50 44 46 (%PDF)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { ext: 'pdf', mime: 'application/pdf', isImage: false };
  }

  // ZIP: 50 4B 03 04 (PK..)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4B &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return { ext: 'zip', mime: 'application/zip', isImage: false };
  }

  // GIF: 47 49 46 38 (GIF8)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { ext: 'gif', mime: 'image/gif', isImage: true };
  }

  return { ext: 'bin', mime: 'application/octet-stream', isImage: false };
}
