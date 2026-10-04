// test/pipeline.test.js — T7, T8, T12 pipeline round-trip, loss simulation, and error verification

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as pako from 'pako';
import { prepareFile, assembleFile, PipelineError } from '../src/lib/pipeline.js';
import { Decoder } from '../src/lib/decoder.js';

function createRandomData(size) {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = (i * 73 + 19) & 0xFF;
  }
  return data;
}

describe('T7 — Full pipeline round-trip', () => {
  const sizes = [1024, 50 * 1024, 200 * 1024]; // 1 KB, 50 KB, 200 KB
  const chunkSizes = [160, 240];

  for (const size of sizes) {
    for (const chunkSize of chunkSizes) {
      it(`round-trips ${size / 1024} KB byte-exact with chunkSize ${chunkSize}`, () => {
        const original = createRandomData(size);
        const sid = 0x4321;
        const { encoder, K, originalSize, compressedSize, crc32 } = prepareFile(original, chunkSize, sid);

        assert.equal(originalSize, size);
        assert.ok(compressedSize > 0);
        assert.ok(K > 0);

        const decoder = new Decoder();
        while (!decoder.isDone) {
          decoder.add(encoder.next());
        }

        const reconstructed = assembleFile(decoder);
        assert.equal(reconstructed.length, original.length);
        assert.deepEqual(Array.from(reconstructed), Array.from(original));
      });
    }
  }
});

describe('T8 — Transmission channel loss & reordering resilience', () => {
  const size = 20 * 1024; // 20 KB
  const chunkSize = 240;

  it('survives 40% random packet loss', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x1101);
    const decoder = new Decoder();

    while (!decoder.isDone) {
      const packet = encoder.next();
      // Drop 40%
      if (Math.random() >= 0.40) {
        decoder.add(packet);
      }
    }

    const reconstructed = assembleFile(decoder);
    assert.deepEqual(Array.from(reconstructed), Array.from(original));
  });

  it('survives shuffled packet arrival order', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x1102);
    const decoder = new Decoder();

    // Collect batches of packets, shuffle each batch, feed to decoder
    while (!decoder.isDone) {
      const batch = [];
      for (let i = 0; i < 20; i++) {
        batch.push(encoder.next());
      }
      // Fisher-Yates shuffle
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
      for (const pkt of batch) {
        decoder.add(pkt);
        if (decoder.isDone) break;
      }
    }

    const reconstructed = assembleFile(decoder);
    assert.deepEqual(Array.from(reconstructed), Array.from(original));
  });

  it('survives burst loss (drops 15 of every 40 packets)', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x1103);
    const decoder = new Decoder();

    let seq = 0;
    while (!decoder.isDone) {
      const packet = encoder.next();
      const pos = seq % 40;
      seq++;
      // Drop first 15 of every 40 packets
      if (pos >= 15) {
        decoder.add(packet);
      }
    }

    const reconstructed = assembleFile(decoder);
    assert.deepEqual(Array.from(reconstructed), Array.from(original));
  });

  it('survives a late joiner starting after 1000 packets', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x1104);

    // Burn 1000 packets before late joiner starts listening
    for (let i = 0; i < 1000; i++) {
      encoder.next();
    }

    const lateDecoder = new Decoder();
    while (!lateDecoder.isDone) {
      lateDecoder.add(encoder.next());
    }

    const reconstructed = assembleFile(lateDecoder);
    assert.deepEqual(Array.from(reconstructed), Array.from(original));
  });

  it('serves two decoders with 30% and 50% loss from one encoder stream', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x1105);

    const decoderA = new Decoder(); // 30% loss
    const decoderB = new Decoder(); // 50% loss

    while (!decoderA.isDone || !decoderB.isDone) {
      const packet = encoder.next();
      if (!decoderA.isDone && Math.random() >= 0.30) {
        decoderA.add(packet);
      }
      if (!decoderB.isDone && Math.random() >= 0.50) {
        decoderB.add(packet);
      }
    }

    assert.equal(decoderA.isDone, true);
    assert.equal(decoderB.isDone, true);

    const reconA = assembleFile(decoderA);
    const reconB = assembleFile(decoderB);
    assert.deepEqual(Array.from(reconA), Array.from(original));
    assert.deepEqual(Array.from(reconB), Array.from(original));
  });
});

describe('T12 — Payload corruption and truncation rejection', () => {
  const size = 5000;
  const chunkSize = 240;

  it('throws on corrupted byte in assembled payload and never returns bytes', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x9991);
    const decoder = new Decoder();

    while (!decoder.isDone) {
      decoder.add(encoder.next());
    }

    // Corrupt one byte of the decoded bytes
    const corruptBytes = new Uint8Array(decoder.decodedBytes);
    const corruptIdx = Math.floor(corruptBytes.length / 2);
    corruptBytes[corruptIdx] ^= 0xFF;

    // Fake decoder with corrupted bytes
    const fakeDecoder = {
      isDone: true,
      crc32: decoder.crc32,
      getDecodedBytes: () => corruptBytes
    };

    assert.throws(
      () => assembleFile(fakeDecoder),
      (err) => {
        assert.ok(err instanceof PipelineError || err instanceof Error);
        assert.ok(err.message === 'inflate failed' || err.message === 'crc mismatch');
        return true;
      }
    );
  });

  it('throws "inflate failed" on truncated payload', () => {
    const original = createRandomData(size);
    const { encoder } = prepareFile(original, chunkSize, 0x9992);
    const decoder = new Decoder();

    while (!decoder.isDone) {
      decoder.add(encoder.next());
    }

    // Truncate payload
    const truncatedBytes = decoder.decodedBytes.subarray(0, decoder.decodedBytes.length - 20);
    const fakeDecoder = {
      isDone: true,
      crc32: decoder.crc32,
      getDecodedBytes: () => truncatedBytes
    };

    assert.throws(
      () => assembleFile(fakeDecoder),
      (err) => {
        assert.ok(err instanceof PipelineError || err instanceof Error);
        assert.equal(err.message, 'inflate failed');
        return true;
      }
    );
  });
});
