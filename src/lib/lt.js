// src/lib/lt.js — PRNG, Robust Soliton distribution, and index selection (spec §6.1, §6.3, §6.4)

/**
 * mulberry32 PRNG (public domain, Tommy Ettinger).
 * Returns a function producing 32-bit unsigned integers.
 * @param {number} seed 32-bit unsigned seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    let t = (s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

// Robust Soliton parameters from spec §6.3
const C = 0.05;
const DELTA = 0.5;

// Cache precomputed CDFs and distribution stats by K
const solitonCache = new Map();

/**
 * Computes or retrieves cached Robust Soliton distribution for K.
 * @param {number} K Number of chunks (>= 1)
 * @param {number} [c=0.05]
 * @param {number} [delta=0.5]
 * @returns {{ R: number, S: number, p1: number, p2: number, mean: number, cdf: Float64Array }}
 */
export function getRobustSoliton(K, c = C, delta = DELTA) {
  if (solitonCache.has(K)) {
    return solitonCache.get(K);
  }

  if (K === 1) {
    const entry = {
      R: 0,
      S: 1,
      p1: 1,
      p2: 0,
      mean: 1,
      cdf: new Float64Array([0, 1.0])
    };
    solitonCache.set(K, entry);
    return entry;
  }

  const R = c * Math.log(K / delta) * Math.sqrt(K);
  const S = Math.floor(K / R);

  // 1-indexed values for d = 1..K
  const mu = new Float64Array(K + 1);
  let sum = 0;

  for (let d = 1; d <= K; d++) {
    const rho = (d === 1) ? (1 / K) : (1 / (d * (d - 1)));
    let tau = 0;
    if (d < S) {
      tau = R / (d * K);
    } else if (d === S) {
      tau = Math.max(0, (R * Math.log(R / delta)) / K);
    }
    const val = rho + tau;
    mu[d] = val;
    sum += val;
  }

  const pdf = new Float64Array(K + 1);
  const cdf = new Float64Array(K + 1);
  let cum = 0;
  let mean = 0;

  for (let d = 1; d <= K; d++) {
    pdf[d] = mu[d] / sum;
    cum += pdf[d];
    cdf[d] = cum;
    mean += d * pdf[d];
  }
  cdf[K] = 1.0;

  const entry = {
    R,
    S,
    p1: pdf[1],
    p2: pdf[2],
    mean,
    cdf
  };

  solitonCache.set(K, entry);
  return entry;
}

/**
 * Samples a droplet degree by binary searching the Robust Soliton CDF.
 * @param {() => number} rng PRNG producing 32-bit unsigned integers
 * @param {number} K Number of source chunks
 * @returns {number} degree in [1, K]
 */
export function sampleDegree(rng, K) {
  if (K <= 1) return 1;
  const { cdf } = getRobustSoliton(K);
  const u = rng() / 4294967296; // in [0, 1)

  let lo = 1;
  let hi = K;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (u < cdf[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/**
 * Samples `degree` distinct indices in [0, K) using the PRNG stream.
 * Sorted ascending. If degree > K/2, uses complement sampling per spec §6.4.
 * @param {() => number} rng PRNG producing 32-bit unsigned integers
 * @param {number} K Number of source chunks
 * @param {number} degree Clamped to [1, K]
 * @returns {number[]} Array of distinct indices in [0, K), sorted ascending
 */
export function sampleIndices(rng, K, degree) {
  if (K <= 1) return [0];

  const d = Math.max(1, Math.min(K, degree));
  if (d === K) {
    const all = new Array(K);
    for (let i = 0; i < K; i++) all[i] = i;
    return all;
  }

  if (d <= (K >> 1)) {
    // Direct sampling
    const chosen = new Set();
    while (chosen.size < d) {
      const idx = Math.floor((rng() / 4294967296) * K);
      chosen.add(idx);
    }
    const arr = Array.from(chosen);
    arr.sort((a, b) => a - b);
    return arr;
  } else {
    // Complement sampling (avoids rejection sampling when degree is close to K)
    const excludedCount = K - d;
    const excluded = new Set();
    while (excluded.size < excludedCount) {
      const idx = Math.floor((rng() / 4294967296) * K);
      excluded.add(idx);
    }
    const arr = new Array(d);
    let outIdx = 0;
    for (let i = 0; i < K; i++) {
      if (!excluded.has(i)) {
        arr[outIdx++] = i;
      }
    }
    return arr;
  }
}

/**
 * Convenience helper: generates the distinct, sorted index set for a droplet given seed and K.
 * Used identically by both encoder and decoder.
 * @param {number} seed 32-bit unsigned integer
 * @param {number} K Number of chunks
 * @returns {number[]} Array of indices
 */
export function getDropletIndices(seed, K) {
  const rng = mulberry32(seed);
  const degree = sampleDegree(rng, K);
  return sampleIndices(rng, K, degree);
}
