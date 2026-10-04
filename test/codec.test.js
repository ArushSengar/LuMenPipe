// test/codec.test.js — T5 & T6: Encoder and Decoder codec tests

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Encoder } from '../src/lib/encoder.js';
import { Decoder } from '../src/lib/decoder.js';
import { packDroplet } from '../src/lib/format.js';

describe('T5 — Loopback codec test', () => {
  const testCases = [
    { K: 1, chunkSize: 240, len: 100 },
    { K: 2, chunkSize: 240, len: 350 },
    { K: 50, chunkSize: 240, len: 50 * 240 - 30 },
    { K: 850, chunkSize: 240, len: 850 * 240 - 15 } // ~200 KB
  ];

  for (const tc of testCases) {
    it(`decodes byte-exact for K=${tc.K} (len=${tc.len})`, () => {
      // Create random data
      const data = new Uint8Array(tc.len);
      for (let i = 0; i < tc.len; i++) {
        data[i] = (i * 41 + 17) & 0xFF;
      }

      const sid = 0x55AA;
      const crc = 0x12345678;
      const encoder = new Encoder(data, tc.chunkSize, sid, crc);
      assert.equal(encoder.K, tc.K);

      const decoder = new Decoder();
      let steps = 0;

      while (!decoder.isDone) {
        steps++;
        const packet = encoder.next();
        const status = decoder.add(packet);
        assert.ok(
          status === 'innovative' || status === 'dependent' || status === 'done',
          `Unexpected status: ${status}`
        );
      }

      assert.equal(decoder.rank, tc.K);
      assert.equal(decoder.isDone, true);
      assert.equal(decoder.sid, sid);
      assert.equal(decoder.K, tc.K);

      const decoded = decoder.getDecodedBytes();
      assert.equal(decoded.length, tc.len);
      assert.deepEqual(Array.from(decoded), Array.from(data));
    });
  }
});

describe('T6 — Duplicate droplets, sid change, and malformed packets', () => {
  it('duplicate packet returns "dependent" and does not change rank', () => {
    const data = new Uint8Array(500);
    const sid = 0x1111;
    const encoder = new Encoder(data, 240, sid, 0);
    const decoder = new Decoder();

    // First droplet
    const pkt1 = encoder.next();
    const st1 = decoder.add(pkt1);
    assert.equal(st1, 'innovative');
    const initialRank = decoder.rank;
    assert.equal(initialRank, 1);
    const initialDep = decoder.dependentCount;

    // Send the exact same droplet again
    const st2 = decoder.add(pkt1);
    assert.equal(st2, 'dependent');
    assert.equal(decoder.rank, initialRank);
    assert.equal(decoder.dependentCount, initialDep + 1);
  });

  it('packet with different sid resets rank to zero and returns "foreign"', () => {
    const data1 = new Uint8Array(500);
    const data2 = new Uint8Array(500);
    const enc1 = new Encoder(data1, 240, 0x1111, 0);
    const enc2 = new Encoder(data2, 240, 0x2222, 0);

    const decoder = new Decoder();
    decoder.add(enc1.next());
    assert.ok(decoder.rank > 0);

    // Foreign packet with sid 0x2222
    const st = decoder.add(enc2.next());
    assert.equal(st, 'foreign');
    assert.equal(decoder.rank, 0);
  });

  it('malformed packet returns "bad"', () => {
    const decoder = new Decoder();

    // Short packet
    assert.equal(decoder.add(new Uint8Array(10)), 'bad');

    // Not multiple of 4 payload
    assert.equal(decoder.add(new Uint8Array(19)), 'bad');

    // Empty packet
    assert.equal(decoder.add(new Uint8Array(0)), 'bad');
  });
});

describe('Performance guard — 200 KB decodes in < 500 ms', () => {
  it('decodes a 200 KB random payload (K ≈ 850) in under 500 ms', () => {
    const len = 850 * 240 - 20; // ~204 KB
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      data[i] = (i * 101 + 23) & 0xFF;
    }

    const encoder = new Encoder(data, 240, 0x9999, 0xCAFEBABE);
    const decoder = new Decoder();

    const t0 = performance.now();
    let packetCount = 0;
    while (!decoder.isDone) {
      packetCount++;
      const packet = encoder.next();
      decoder.add(packet);
    }
    const elapsed = performance.now() - t0;

    console.log(`[Performance Guard] 200 KB (K=850, ${packetCount} packets): ${elapsed.toFixed(1)} ms`);
    assert.ok(elapsed < 500, `Expected < 500 ms, took ${elapsed} ms`);
    assert.equal(decoder.isDone, true);
    assert.equal(decoder.getDecodedBytes().length, len);
  });
});
