# CLAUDE.md — LumenPipe repo rules (put this file in the repo root)

LumenPipe: one-way optical file transfer. A laptop screen shows an N×N grid of QR codes; phone cameras rebuild the file with LT fountain codes. Hackathon build, 8 hours, built from scratch in this repo. The contract is `MVP_Architecture_Specification.md`; if this file and the spec disagree, stop and ask.

## Invariants — do not violate

1. **Built here, built now.** Only the pinned open-source libraries and code written in this repo during the event. Don't paste code from earlier projects. If you reuse a public snippet (e.g. a well-known PRNG), say so in a comment and tell me, so it goes in `DISCLOSURE.md`.
2. **Pure logic is DOM-free** (`src/lib/*`) and tested with Node's built-in `node:test`. UI code stays thin.
3. **One shared module** for the PRNG, degree sampling and index selection (`src/lib/lt.js`), imported by both encoder and decoder. Never duplicate it.
4. **Seeds:** random 32-bit per droplet (`crypto.getRandomValues`). Never a fixed counter from 1. Tests may inject a seed sequence.
5. **Packet:** exactly the spec §4 (16-byte little-endian header + payload). `K` is in every header.
6. **Decoder:** incremental GF(2) elimination. Complete when `rank == K`. Never concatenate droplets, never use a "K + ε" threshold, never add ACK/NACK or any receiver-to-sender channel. Dependent and duplicate droplets are discarded silently.
7. **Integrity:** CRC32 of the ORIGINAL (uncompressed) bytes in the header; `pako.inflate` errors and CRC mismatches both produce a visible FAILED state. Never offer a file that failed verification.
8. **QR:** byte mode, ECC L. Sender draws the module matrix itself at an integer number of **device** pixels per module (CSS size = canvas size ÷ `devicePixelRatio`), image smoothing off. Never use `toCanvas`/`toDataURL` scaling. Receiver reads `binaryData`, never `data` text.
9. **Sender loop:** one `requestAnimationFrame` loop with an elapsed-time accumulator. FPS only from {5, 6, 10, 12, 15, 20, 30}, default 10. No `setTimeout`/`setInterval`, no `await` in the draw path.
10. **Receiver loop:** `requestVideoFrameCallback` when available, else `requestAnimationFrame`. 2D context with `willReadFrequently: true`, resized only when the size changes. `jsQR(..., { inversionAttempts: 'dontInvert' })`. **No `setState` inside the scan loop**: counters live in refs; the HUD refreshes ≤ 4 times per second. Stop all media tracks on stop/unmount.
11. **Stack:** JavaScript (not TypeScript), plain CSS, hash routing, no Tailwind, no router library, no state library. Dependencies pinned to exact versions from the spec. `import * as pako from 'pako'`.
12. **Not in the MVP** (do not add unless I ask): Web Workers, adaptive bit-rate, encryption, filename metadata, anchor drawing in the QR margins, backend, auth, analytics.
13. **Claims:** never write that it is secure/encrypted/interception-proof; never write a throughput number that didn't come from a test or the HUD; in code comments, README and UI text, anything involving a real camera is "unverified" until I say I tested it.
14. **Don't invent.** If you don't know a library option or a browser API, say so and give me a way to check. Prefer reading the installed package's own files over guessing.

## Commands (must exist after stage P0)

- `npm run dev` · `npm run build` · `npm run preview` · `npm test` (node:test, files in `test/*.test.js`)

## Report format (end every reply with this)

- **Stage / status:** DONE or NOT DONE
- **Commands run** with the real pass/fail output (paste the summary lines)
- **Files created/changed**
- **Unverified** (needs a phone / my laptop screen / the network)
- **Questions or disagreements** (including anything in the spec you think is wrong)
- **Suggested commit message**

## Working style

One stage at a time. Tests first, then code. Small functions, short comments for non-obvious maths (the elimination, the CDF), no dead code. If something fails twice, stop and show me the failing output instead of trying a third guess.
