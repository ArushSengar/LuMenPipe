// test/lt.test.js — T3 & T4: PRNG, Robust Soliton CDF, index selection, overhead tests

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32,
  getRobustSoliton,
  sampleDegree,
  sampleIndices,
  getDropletIndices
} from '../src/lib/lt.js';

describe('T3 — PRNG, Soliton distribution & index selection', () => {
  it('mulberry32 matches known-answer vectors in spec §6.1', () => {
    const rng1 = mulberry32(1);
    assert.equal(rng1(), 2693262067);
    assert.equal(rng1(), 11749833);
    assert.equal(rng1(), 2265367787);

    const rngDead = mulberry32(0xDEADBEEF);
    assert.equal(rngDead(), 4043151706);
    assert.equal(rngDead(), 1147597007);
    assert.equal(rngDead(), 3315858022);
  });

  it('same seed twice gives identical index sets', () => {
    for (const K of [1, 2, 50, 100, 200]) {
      const seed = 0xCAFEBABE;
      const set1 = getDropletIndices(seed, K);
      const set2 = getDropletIndices(seed, K);
      assert.deepEqual(Array.from(set1), Array.from(set2));
    }
  });

  it('indices are sorted ascending, distinct, and within [0, K)', () => {
    const testK = [1, 2, 5, 20, 50, 200];
    for (const K of testK) {
      for (let s = 1; s <= 50; s++) {
        const indices = getDropletIndices(s * 1000 + 7, K);
        assert.ok(indices.length >= 1 && indices.length <= K);

        // Within [0, K) and sorted strictly ascending (which also guarantees distinct)
        for (let i = 0; i < indices.length; i++) {
          assert.ok(indices[i] >= 0 && indices[i] < K, `Index ${indices[i]} out of bounds for K=${K}`);
          if (i > 0) {
            assert.ok(indices[i] > indices[i - 1], `Indices not strictly ascending: ${indices[i - 1]} >= ${indices[i]}`);
          }
        }
      }
    }
  });

  it('K = 1 always returns [0]', () => {
    for (let s = 0; s < 20; s++) {
      const indices = getDropletIndices(s * 9999 + 1, 1);
      assert.deepEqual(Array.from(indices), [0]);
    }
  });

  it('Robust Soliton table in spec §6.3 matches within tolerance', () => {
    // Spec §6.3 table:
    // K   | R      | S = floor(K/R) | P(deg=1) | P(deg=2) | mean degree
    // 50  | 1.628  | 30             | 0.045    | 0.442    | 5.65
    // 100 | 2.649  | 37             | 0.032    | 0.445    | 6.73
    // 200 | 4.237  | 47             | 0.023    | 0.448    | 7.89
    // 400 | 6.685  | 59             | 0.017    | 0.454    | 9.01
    // 850 | 10.843 | 78             | 0.013    | 0.460    | 10.31
    // Tolerances: ±0.002 on probabilities, ±0.05 on mean degree, ±0.005 on R.

    const expectedTable = [
      { K: 50, R: 1.628, S: 30, p1: 0.045, p2: 0.442, mean: 5.65 },
      { K: 100, R: 2.649, S: 37, p1: 0.032, p2: 0.445, mean: 6.73 },
      { K: 200, R: 4.237, S: 47, p1: 0.023, p2: 0.448, mean: 7.89 },
      { K: 400, R: 6.685, S: 59, p1: 0.017, p2: 0.454, mean: 9.01 },
      { K: 850, R: 10.843, S: 78, p1: 0.013, p2: 0.460, mean: 10.31 }
    ];

    for (const exp of expectedTable) {
      const dist = getRobustSoliton(exp.K);
      assert.ok(Math.abs(dist.R - exp.R) <= 0.005, `K=${exp.K} R diff: ${dist.R} vs ${exp.R}`);
      assert.equal(dist.S, exp.S, `K=${exp.K} S diff: ${dist.S} vs ${exp.S}`);
      assert.ok(Math.abs(dist.p1 - exp.p1) <= 0.002, `K=${exp.K} p1 diff: ${dist.p1} vs ${exp.p1}`);
      assert.ok(Math.abs(dist.p2 - exp.p2) <= 0.002, `K=${exp.K} p2 diff: ${dist.p2} vs ${exp.p2}`);
      assert.ok(Math.abs(dist.mean - exp.mean) <= 0.05, `K=${exp.K} mean diff: ${dist.mean} vs ${exp.mean}`);
    }
  });
});

describe('T4 — Fountain code overhead simulation', () => {
  // Small throwaway elimination loop to measure overhead %:
  function simulateElimination(K, trials = 200) {
    const words = Math.ceil(K / 32);
    const overheads = [];

    for (let t = 0; t < trials; t++) {
      const pivots = new Array(K).fill(null);
      let rank = 0;
      let droplets = 0;

      while (rank < K) {
        droplets++;
        const seed = Math.floor(Math.random() * 0xFFFFFFFF);
        const indices = getDropletIndices(seed, K);

        const row = new Uint32Array(words);
        for (const idx of indices) {
          row[idx >>> 5] ^= (1 << (idx & 31));
        }

        // Reduce row against pivot table
        while (true) {
          let pivot = -1;
          for (let w = 0; w < words; w++) {
            const val = row[w];
            if (val !== 0) {
              const bit = 31 - Math.clz32(val & -val);
              pivot = (w << 5) + bit;
              break;
            }
          }
          if (pivot === -1) {
            break; // dependent row
          }
          if (pivots[pivot] === null) {
            pivots[pivot] = row;
            rank++;
            break;
          } else {
            const p = pivots[pivot];
            for (let w = 0; w < words; w++) {
              row[w] ^= p[w];
            }
          }
        }
      }
      overheads.push(((droplets - K) / K) * 100);
    }

    overheads.sort((a, b) => a - b);
    const median = overheads[Math.floor(trials * 0.5)];
    const p90 = overheads[Math.floor(trials * 0.9)];
    const p99 = overheads[Math.floor(trials * 0.99)];
    return { median, p90, p99 };
  }

  it('measures overhead at K = 50, 100, 200, 400 (≥ 200 trials each)', () => {
    const results = {};
    for (const K of [50, 100, 200, 400]) {
      const res = simulateElimination(K, 200);
      results[K] = res;
      console.log(`[T4 Measured] K = ${K}: median = ${res.median.toFixed(1)}%, p90 = ${res.p90.toFixed(1)}%, p99 = ${res.p99.toFixed(1)}%`);
    }

    // Spec §6.6 check: p90 at K = 200 must not exceed 8%
    assert.ok(results[200].p90 <= 8.0, `p90 at K=200 exceeded 8%: was ${results[200].p90}%`);
  });
});
