# LumenPipe — Staged Prompts (paste one at a time, in order)

**Before you paste anything:** the build must have started (see `00_START_HERE.md`). Attach `CLAUDE.md`, `MVP_Architecture_Specification.md` and `CLAUDE_BRIEF.txt` to your AI tool first.
**Rule for every stage:** don't move on until the stage's gate passes. Commit after each green stage. Times below are targets for a 13:00 start; the runbook's §6 is the master schedule.
**These prompts contain no code on purpose.** The AI writes it, in your repo, during the event.

---

## Opening message (paste once, at the start of the session)

```text
You are my pair-programmer for LumenPipe, a one-way optical file transfer: a laptop screen shows a grid of QR codes and phone cameras rebuild the file with LT fountain codes. It is being built from scratch inside an 8-hour hackathon, so we work in small stages and I paste one stage prompt at a time. The attached CLAUDE.md (rules) and MVP_Architecture_Specification.md (contract) override anything you assume or remember; if you think either is wrong, tell me before coding. For every stage: write the listed tests first, then the implementation, run them, and report only what you actually ran, with the real output. Anything that needs a real camera or screen is "unverified". Never invent library options, browser APIs, benchmark numbers or results. Reply "ready" and list any ambiguity you see in the spec.
```

---

## P0 — Skeleton and toolchain (13:00–13:20) · gate: build and test run, page deployed

```text
Stage P0: repo skeleton and toolchain.
Create a Vite + React app in JavaScript with hash routing: "#/" shows a landing page with two buttons (Send, Receive), "#/send" and "#/receive" show a placeholder each. No router library.
Pin every dependency to the exact versions in the spec section 2 (no ^ or ~). Dev dependencies: vite, @vitejs/plugin-react, vite-plugin-pwa. Runtime: react, react-dom, qrcode, jsqr, pako.
Configure vite-plugin-pwa with registerType "autoUpdate", a manifest (name LumenPipe, short_name LumenPipe, display standalone, start_url ".", theme and background colour #0a0f1d, icons /icon-192.png and /icon-512.png from public/). I will supply those two PNG files myself; do not generate them.
npm scripts: dev, build, preview, test (Node's built-in test runner on test/*.test.js, no extra framework).
Create the empty folders and files from the spec section 11 (empty stubs are fine).
Add one smoke test (T13) that imports pako as a namespace, qrcode and jsqr, and calls each once (deflate/inflate a few bytes; create a QR; call jsQR on a tiny blank image and expect null).
Acceptance: npm run build passes, npm test passes, dist contains sw.js and manifest.webmanifest. Do not write any fountain-code or QR-drawing logic yet.
Report in the CLAUDE.md format.
```
**Then you:** deploy to HTTPS (Vercel/GitHub Pages) and open it on both phones. First commit = this skeleton.

## P1 — Wire format (13:20–14:00) · gate: T1, T1b, T2 pass

```text
Stage P1: wire format. Pure functions, no DOM, in src/lib/format.js with tests in test/format.test.js.
Implement: crc32 (standard IEEE CRC-32); packHeader/unpackHeader and packDroplet/parseDroplet exactly as in the spec section 4 (little-endian; parseDroplet returns null for anything that fails the validity checks listed there); splitChunks(bytes, chunkSize) returning K and zero-padded chunks; joinChunks(chunks, compressedLen).
Write the tests FIRST: T1 including the known-answer header bytes (sid 0x1234, K 200, seed 0xDEADBEEF, compressedLen 48000, crc32 0xCBF43926 must give exactly 34 12 c8 00 ef be ad de 80 bb 00 00 26 39 f4 cb), T1b (CRC32 of the ASCII string "123456789" is 0xCBF43926), and T2 at lengths 1, 2, 239, 240, 241 and 5000. Add negative tests for parseDroplet (too short, length not a multiple of 4, K = 0, compressedLen too large or too small for K).
Acceptance: npm test passes; show me the output. Report in the CLAUDE.md format.
```

## P2 — PRNG, degree distribution, index selection (14:00–14:45) · gate: T3, T4

```text
Stage P2: src/lib/lt.js (single shared module) with tests in test/lt.test.js.
Implement mulberry32 (the public-domain PRNG), the Robust Soliton CDF with c = 0.05 and delta = 0.5 exactly as in spec section 6.3 (spike index floor(K/R), negative tau clamped to 0, CDF cached per K), degree sampling by binary search, and index selection per spec section 6.4 (distinct, sorted ascending, complement sampling above K/2, K = 1 returns [0]).
Tests FIRST: the mulberry32 known-answer vectors in spec 6.1; same seed twice gives identical index sets; indices sorted, distinct, within [0, K); the K, R, spike, P(1), P(2) and mean-degree table in spec 6.3 within the stated tolerances; and T4: overhead at K = 50, 100, 200 and 400 with at least 200 trials each and random seeds, using a small throwaway elimination loop inside the test file (the real decoder comes in P3). Print median, p90 and p99 and compare with spec 6.6. Tell me whether p90 at K = 200 is above 8%; if it is, stop and show me instead of changing c.
Report in the CLAUDE.md format, including the T4 table you measured.
```

## P3 — Encoder and decoder (14:45–15:30) · gate: T5, T6

```text
Stage P3: src/lib/encoder.js and src/lib/decoder.js with tests in test/codec.test.js.
Encoder: constructed with the compressed bytes, chunkSize (multiple of 4) and sid; next() returns one packet (header + payload) with a fresh random 32-bit seed, using lt.js for the index set and 32-bit word XOR for the payload. The encoder must also accept an injected seed source for tests.
Decoder: incremental GF(2) elimination exactly as in spec 6.6. add(packet) returns one of 'innovative', 'dependent', 'foreign', 'bad', 'done'. Expose rank, K, accepted count, dependent count, sid, compressedLen and, when done, the assembled compressed bytes truncated to compressedLen. A changed sid resets the decoder. Back-substitute once when rank reaches K.
Tests FIRST: T5 (feed random droplets until rank equals K; every recovered chunk is byte-exact) for K = 1, 2, 50 and 850; T6 (a repeated packet returns 'dependent' and does not change rank; a packet with a different sid resets rank to zero; a malformed packet returns 'bad'). Add a performance guard: a 200 KB random file (K about 850) decodes in under 500 ms.
Acceptance: npm test passes. Report in the CLAUDE.md format.
```

## P4 — Full pipeline in Node (15:30–16:00) · gate: T7, T8, T12 — **Level 1 done**

```text
Stage P4: src/lib/pipeline.js and test/pipeline.test.js.
prepareFile(bytes, chunkSize, sid) deflates the bytes with pako, computes the CRC32 of the ORIGINAL bytes, and returns an encoder plus metadata (K, sizes). assembleFile(decoder) inflates the decoder's output, compares the CRC32 with the header value, and returns the original bytes, or throws a typed error with a readable reason ('inflate failed' or 'crc mismatch').
Tests FIRST:
T7: 1 KB, 50 KB and 200 KB random files round-trip byte-exact, for chunk sizes 160 and 240.
T8: reconstruction survives 40% random packet loss, a shuffled order, a burst loss (drop 15 of every 40 packets), a late joiner that starts after 1000 packets, and two decoders with 30% and 50% loss fed from one encoder.
T12: corrupt one byte of the assembled compressed payload, and separately truncate it; assembleFile must throw with the right reason and never return bytes.
Acceptance: npm test passes with all tests listed. Then run npm run build. Report the exact commands and the pass counts in the CLAUDE.md format. This is the end of the software-only work: tell me if anything in T1 to T13 (except the optical ones) is not covered.
```

## P5 — Sender UI (16:00–16:30) · gate: layout tests pass, a stock scanner app reads one cell

```text
Stage P5: the sender screen at #/send (src/sender/Sender.jsx) and src/lib/plans.js and src/lib/qrdraw.js.
plans.js holds Plans A, B and C from the spec section 5. qrdraw.js has pure layout functions: given a plan, the available square in device pixels and the device pixel ratio, return the integer device pixels per module, the grid size in device pixels, and the CSS size (grid pixels divided by devicePixelRatio).
Sender behaviour (spec 6.7): a file picker; read as ArrayBuffer; warn above 200 KB and refuse above 1 MB; deflate with pako; CRC32 of the original bytes; show name, original and compressed size, K, chunk size, QR version, device px per module and droplets sent. Plan selector and an FPS selector limited to 5, 6, 10, 12, 15, 20, 30 (default 10). Start/Stop; a new random sid on each Start; a Fullscreen button; a visible reminder to set screen brightness to 100% and turn auto-brightness off. Each tick, create N x N packets with the encoder, build each QR with QRCode.create (byte mode, ECC L), and draw the module matrix yourself onto one canvas: each cell is modules + 8 modules wide with a white quiet zone, cells tile edge to edge, image smoothing off, image-rendering pixelated. Use a single requestAnimationFrame loop with an elapsed-time accumulator; no timers, no await in the draw path.
Tests FIRST (qrdraw only): for each plan, for viewport sizes 1920x1080, 1536x864, 1366x768 and 2560x1440, and device pixel ratios 1, 1.25, 1.5 and 2, the module size is a positive integer number of device pixels, the grid fits the available square, and canvas pixels divided by devicePixelRatio equals the CSS size.
Acceptance: npm test, npm run build. Print the chosen device px per module and grid size for 1920x1080 at dpr 1, 1.25 and 1.5 for Plan A. Tell me exactly how to check that a stock phone scanner app can read one cell of the grid.
Report in the CLAUDE.md format.
```
**Then you:** run the scanner-app check on both phones (runbook §2). Write down the distances.

## P6 — Receiver (16:30–17:15) · gate: tests pass; HUD and overlay render on a phone

```text
Stage P6: the receiver screen at #/receive (src/receiver/Receiver.jsx) and src/lib/crop.js.
crop.js is pure: given the video width and height, the grid size N and a padding fraction, return the central square (side = min(width, height)) and the N x N padded cell rectangles, clamped to the frame.
Tests FIRST for crop.js: for 1920x1080, 1280x720 and portrait 1080x1920, N = 1, 2 and 3, padding 0.12: rectangles lie inside the frame, are square, and the N = 2 cells overlap each other only through the padding.
Receiver behaviour (spec 6.8): a Start button (user gesture) calls getUserMedia with the rear camera preferred, ideal 1920x1080 at 30 fps, no audio; if window.isSecureContext is false, show a clear message instead. After start, show the delivered track settings (width x height, frame rate) in the HUD. Show the live video with an overlay: the central square and the cell rectangles, green if that cell decoded in the last 500 ms, red otherwise. A grid selector (1x1 or 2x2, default 2x2). Scan loop: requestVideoFrameCallback if available, else requestAnimationFrame; for each new frame draw each padded cell rectangle onto one reusable canvas (getContext('2d', { willReadFrequently: true }), resized only when the size changes), getImageData, jsQR with inversionAttempts 'dontInvert'; if binaryData is present, parseDroplet and give it to the decoder. The scan loop must not call setState: keep counters in refs and refresh the HUD from a timer at most 4 times per second. If a frame takes longer than the interval, just process the next frame. Stop all media tracks on Stop and on unmount.
HUD: state (IDLE, STARTING, SEARCHING, STREAMING, COMPLETE, FAILED with reason), delivered resolution and fps, scan rounds per second, QR decodes per second, rank over K, accepted droplets, dependent droplets, jsQR ms per cell (moving average), elapsed seconds (stops at completion), progress bar equal to rank over K.
When the decoder reaches rank K, call assembleFile and show COMPLETE or FAILED with the reason (the result card is the next stage).
Do not add Web Workers, adaptive bit-rate or anchor drawing.
Acceptance: npm test, npm run build. Tell me exactly which HUD numbers to read on the phone and what each one means. Report in the CLAUDE.md format; everything optical is "unverified".
```

## P7 — First optical loop (17:15–18:00) · **THE GATE: G1, G2** (human work; the AI only fixes what you report)

Do this with the real phones. Sender fullscreen at 100% brightness, plain white around the grid, dark cloth behind the laptop if there is glare, phone on a stand at the taped distance. **G1** = one cell reads in the browser. **G2** = rank climbs during a stream.

If it doesn't work, paste this (fill in the brackets with what you actually saw):

```text
Optical bug report. Plan: [A/B/C]. Phone: [model]. Delivered resolution and fps from the HUD: [..]. Distance: [..] m, phone on a stand: [yes/no]. Sender: [screen size, fullscreen yes/no, brightness], reported device px per module: [..]. What I see: [HUD state; QR decodes/s; scan rounds/s; jsQR ms per cell; which cells are green/red in the overlay; rank over K after 30 s]. Using only the spec and CLAUDE.md, list the three most likely causes in order of probability with the measurement that would confirm or rule out each, then propose the smallest change for the first one. Don't change anything else and don't invent numbers.
```

**Decision rule:** if G1 isn't passed by 18:00 (or 5 hours into the build), downgrade one plan (A → B → C), then darken the room and shorten the distance. Don't keep debugging the same configuration into the deadline.

Add this small stage once G1 passes:

```text
Stage P7b: calibration support. (1) On the receiver, add a "Copy stats" button that copies one line of text to the clipboard: plan/grid selector, delivered resolution and fps, QR decodes per second, jsQR ms per cell, elapsed seconds at completion or the current rank over K. (2) On the sender, show the current plan letter and FPS in large text above the grid so a photo of my setup records the settings. (3) A Reset button on the receiver. No other changes. Acceptance: npm test and npm run build pass. Report in the CLAUDE.md format.
```

## P8 — Result card (18:00–18:30) · gate: T12 on-screen; a real file opens on the phone

```text
Stage P8: result handling per spec 6.9, with src/lib/sniff.js and test/sniff.test.js.
On success show byte count, CRC32 hex, "CRC OK", detected type by magic bytes (PNG 89 50 4E 47, JPEG FF D8 FF, PDF 25 50 44 46, ZIP 50 4B 03 04, GIF 47 49 46 38, otherwise bin), an inline preview for images, and a Save/Open button using a Blob URL (revoked on reset), default name lumenpipe_received.<ext>. On inflate error or CRC mismatch show FAILED with the reason and a Retry that resets the decoder; never offer a file that failed verification.
Tests FIRST: sniff.js on one fixture per type plus an unknown type and an empty array.
Acceptance: npm test, npm run build. Report in the CLAUDE.md format.
```

## P9 — PWA and offline (18:30–19:00) · gate: airplane-mode check on both phones

```text
Stage P9: installable, offline receiver. Make sure the manifest references icon-192.png and icon-512.png, the service worker precaches the app shell and every JS/CSS asset, and the receiver route works from the cache. Keep registerType "autoUpdate" but tell me honestly whether an update can reload the page during a transfer; if you can't rule it out, say so and add a README line: "freeze deploys before judging".
Acceptance: npm run build lists the precache entries. Give me a step-by-step checklist for each phone: open the HTTPS URL, install/Add to Home Screen, turn airplane mode on, open the installed app, confirm the camera permission still works. Don't claim it works until I report back. Report in the CLAUDE.md format.
```

## P10 — Hardening for the demo (19:00–19:30) · gate: T11 and the 4-of-5 check

```text
Stage P10: make the demo hard to break. (1) Receiver messages for: camera permission denied, no camera, insecure context, unsupported browser, a foreign stream (different sid mid-transfer: reset and say so). (2) Cover-and-resume: confirm in the code that nothing resets rank when frames stop arriving, and show "SEARCHING" in the HUD after 1.5 s without a decode. (3) An on-screen error boundary that shows the error text instead of a blank page. (4) Optional: Screen Wake Lock on the receiver, feature-detected, errors swallowed; tell me honestly whether you could verify it works. (5) Mobile layout check at 360x800 and desktop 1366x768: no horizontal scroll, buttons at least 44 px tall.
Add tests for whatever is pure (sid-change reset is already T6). Acceptance: npm test, npm run build. Report in the CLAUDE.md format.
```
**Then you:** run T10 (two phones) and T11 (cover for 5 s). Then do 5 consecutive transfers of the demo payload on the demo setup; record how many complete with CRC OK in ≤ 60 s. That number goes in the README as-is.

## P11 — Documents and audit (19:30–20:30) · gate: Level 4

```text
Stage P11: documentation and audit. (1) Fill README.md from README.template.md using ONLY numbers I paste below from the HUD/Copy stats; leave any other cell as "not measured". (2) Fill DISCLOSURE.md from DISCLOSURE.template.md with the tools list from package.json and the AI tools I name below. (3) Audit the repo against every invariant in CLAUDE.md: list each invariant with PASS/FAIL and the file/line that proves it. (4) Search README, UI text and comments for banned claims (secure, encrypted, interception-proof, adaptive bit-rate, Web Worker, any KB/s or MB/s figure not in my pasted numbers) and list every hit. (5) From a clean clone: npm ci, npm test, npm run build, and report the output. Don't change code unless an audit item fails; for each failure, show the fix and the test.
My numbers: [paste Copy stats lines and the 4-of-5 result].
AI tools used: [list].
Report in the CLAUDE.md format.
```

---

## Utility prompts

**Stuck on a failing test (after two attempts):**
```text
Stop guessing. Show me the failing test name, the exact assertion output, the function under test, and the smallest input that reproduces it. Then state your hypothesis in one sentence and the one check that would confirm it. Do not change the test to make it pass.
```

**Slow phone (HUD shows jsQR ms per cell high, decodes/s low):**
```text
The receiver is CPU-bound on [phone]: jsQR ms per cell is [..], scan rounds per second is [..], decodes per second is [..]. Without adding Web Workers, list the changes in order of expected benefit (for example lower capture resolution, fewer cells, skipping cells whose pixels did not change since the last frame, scanning every second frame) and implement only the first one behind a setting I can toggle on screen, with a test for any pure part.
```

**Last-hour review (about 20:30):**
```text
Read the repo as a hackathon judge. List (1) anything in the UI or README that claims more than we measured, (2) anything that would fail if the venue Wi-Fi is down, (3) anything that depends on a single point of failure in the demo, (4) any dependency or snippet that isn't in DISCLOSURE.md. Don't edit files; give me a prioritised list.
```
