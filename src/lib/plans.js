// src/lib/plans.js — Plans A, B, C definitions (spec §5)

export const PLANS = {
  A: {
    id: 'A',
    name: 'Plan A (2×2, 240B, v10)',
    gridN: 2,
    chunkSize: 240,
    packetSize: 256,
    qrVersion: 10,
    modules: 57,
    captureRequest: { width: 1920, height: 1080 }
  },
  B: {
    id: 'B',
    name: 'Plan B (2×2, 160B, v8)',
    gridN: 2,
    chunkSize: 160,
    packetSize: 176,
    qrVersion: 8,
    modules: 49,
    captureRequest: { width: 1920, height: 1080 }
  },
  C: {
    id: 'C',
    name: 'Plan C (1×1, 240B, v10)',
    gridN: 1,
    chunkSize: 240,
    packetSize: 256,
    qrVersion: 10,
    modules: 57,
    captureRequest: { width: 1280, height: 720 }
  }
};
