# LumenPipe — MVP Build Specification (v2)

Status labels: **[VERIFIED]** checked in a Node sandbox on 4 Oct 2026 · **[MEASURED]** a simulation run that day · **[ESTIMATE]** reasoning, not a measurement · **[UNKNOWN]** needs your phones or the organizers. Nothing here has been tested with a real camera.

## 1. What It Is
A one-way optical file transfer. A laptop screen shows a grid of QR codes ("droplets"); phone cameras read them in a browser page and rebuild the file with LT fountain codes. No pairing, no feedback channel, no radio on the data channel, and one stream serves every phone in line of sight. The channel is **public**: anyone who can see the screen can read it. The MVP verifies integrity, not secrecy.

## 2. Stack (pin exact versions — no `^`)
| Part | Choice |
|---|---|
| Frontend | React 19.3.0 + Vite 8.3.2 + @vitejs/plugin-react 6.1.1, **JavaScript** (not TypeScript), plain CSS, hash routing (`#/send`, `#/receive`) |
| Backend / DB / Auth | None |
| PWA | vite-plugin-pwa 2.0.0 |
| Libraries | qrcode 1.5.4 · jsqr 1.4.0 · pako 3.0.2 (`import * as pako from 'pako'`) |
| Tests | Node's built-in `node:test`, files in `test/*.test.js`, no extra framework |
| AI in the product | None. AI is in the development workflow only (disclosed). |
| Runtime | Node ^20.19 or ≥ 22.12 (Vite 8's requirement) [VERIFIED]; Chrome on Android assumed [UNKNOWN] |

Why plain CSS and no router library: fewer moving parts in an 8-hour build. Hash routing needs no server rewrites, which also keeps the PWA simple.

## 3. Core Features (MVP only)
1. **Sender screen** (`#/send`): pick a file → compress → stream an N×N grid of QR droplets, with plan and FPS selectors, fullscreen, and counters.
2. **Receiver screen** (`#/receive`): open the camera, find droplets in the cell rectangles, solve incrementally, show a live HUD, verify and offer the file.
3. **Verification**: CRC32 of the original bytes plus `inflate` success; a failure is shown, never silent.
4. **Installable offline receiver** (PWA), so airplane mode works after one visit.

## 4. Data Model — the packet
Little-endian. 16-byte header, then payload.

| Offset | Size | Field | Definition |
|---|---|---|---|
| 0 | u16 | `sid` | Random per "Start". Receiver resets when it changes. |
| 2 | u16 | `K` | Number of chunks (≥ 1, ≤ 65535). Index selection depends on it. |
| 4 | u32 | `seed` | Random per droplet. |
| 8 | u32 | `compressedLen` | Length of the deflate output before zero-padding. |
| 12 | u32 | `crc32` | CRC32 (IEEE) of the **original, uncompressed** file bytes. |
| 16 | `chunkSize` | `payload` | XOR of the chunks chosen for this droplet. Last source chunk is zero-padded. |

Validity checks the parser must apply: total length ≥ 17; `(length − 16) % 4 == 0`; `K ≥ 1`; `compressedLen ≤ K × chunkSize` and `compressedLen > (K − 1) × chunkSize`. Anything else → `null` (ignored).

Compression: `pako.deflate` → `pako.inflate` (zlib format). JPEG, PNG and PDF barely shrink, so the demo file's transfer size is roughly its own size.

Limits: the UI warns above 200 KB and refuses above 1 MB (time to transfer, not a format limit).

## 5. Plans (the downgrade ladder)
| Plan | Grid | QR version (ECC L) | `chunkSize` → packet | Capture request | Best-case px/module* |
|---|---|---|---|---|---|
| **A (default)** | 2×2 | v10 (57 modules) | 240 B → 256 B | 1920×1080 | 8.3 at 1080p |
| **B** | 2×2 | v8 (49 modules) | 160 B → 176 B | 1920×1080 if the phone CPU copes, else 1280×720 | 9.5 at 1080p / 6.3 at 720p |
| **C** | 1×1 | v10 | 240 B → 256 B | 1280×720 | 11.1 at 720p |

*Ceiling = capture height ÷ (N × (modules + 8)), reached only when the grid exactly fills the camera's square crop; real values are lower (§5 of Runbook v2 has the distance tables). [VERIFIED arithmetic; distances are ESTIMATES]

- QR capacities at ECC L, byte mode: v8 192 B, v10 271 B, v12 367 B [VERIFIED]. `QRCode.create` picks the smallest version that fits (256 B → v10, 176 B → v8) [VERIFIED].
- Rule from an earlier crude simulation [MEASURED, simulated camera, not a real one]: 40/40 decoded at ≥ 6 px/module; roughly 19–24 of 30 at ~4; 0 of 30 at ≤ 2.5. Raising ECC did not help at equal code size. Treat as orientation only.
- Start with Plan A **only if both phones actually deliver 1080p** (the HUD shows what `getUserMedia` really gave). Otherwise start at B (720p) or C.
- **Phone-side grid selector** (1×1 / 2×2) must match the sender's plan. The plan itself is not in the packet (the QR version is implied by the packet length).

## 6. Algorithms

### 6.1 PRNG
`mulberry32` (public-domain, Tommy Ettinger). It returns 32-bit unsigned values; divide by 2³² for a float in [0, 1). **Known-answer vectors** (u32 outputs): seed `1` → `2693262067, 11749833, 2265367787`; seed `0xDEADBEEF` → `4043151706, 1147597007, 3315858022`. [VERIFIED against the canonical form]

### 6.2 Seeds
A fresh random 32-bit seed per droplet (`crypto.getRandomValues`). [MEASURED, K = 200, c = 0.05, 400 trials: random seeds and random-start consecutive seeds both gave median 1.5–2%, p90 5–6%. A fixed counter from 1 is a single deterministic draw: K = 100 needed +9–11% on every broadcast.] Duplicate seeds are harmless (the decoder treats them as dependent rows).

### 6.3 Degree distribution — Robust Soliton, c = 0.05, δ = 0.5
ρ(1) = 1/K; ρ(d) = 1/(d(d−1)) for d = 2…K. R = c·ln(K/δ)·√K. Spike index S = ⌊K/R⌋. τ(d) = R/(d·K) for d < S; τ(S) = max(0, R·ln(R/δ)/K); τ(d) = 0 above S. Normalise ρ+τ to a CDF; draw one uniform from the PRNG and binary-search the CDF for the degree.

Sanity values, c = 0.05, δ = 0.5 [VERIFIED computed]:

| K | R | S = ⌊K/R⌋ | P(degree = 1) | P(degree = 2) | mean degree |
|---|---|---|---|---|---|
| 50 | 1.628 | 30 | 0.045 | 0.442 | 5.65 |
| 100 | 2.649 | 37 | 0.032 | 0.445 | 6.73 |
| 200 | 4.237 | 47 | 0.023 | 0.448 | 7.89 |
| 400 | 6.685 | 59 | 0.017 | 0.454 | 9.01 |
| 850 | 10.843 | 78 | 0.013 | 0.460 | 10.31 |

Tolerance for tests: ±0.002 on probabilities, ±0.05 on the mean degree.

### 6.4 Index selection
After the degree draw, pick `degree` **distinct** indices in [0, K) using the same PRNG stream; keep them sorted ascending. If `degree > K/2`, sample the complement instead (avoids slow rejection sampling near degree ≈ K). Degree is clamped to [1, K]. For K = 1 the only index is 0.

### 6.5 Encoder
Holds the compressed bytes, split into K chunks, the last zero-padded. Each `next()` call: draw a random seed → compute the index set → XOR those chunks (work on 32-bit words; `chunkSize` is a multiple of 4) → return header + payload. The encoder never repeats state and never stops.

### 6.6 Decoder (incremental GF(2))
- Row = bitmask over K unknowns (`Uint32Array` of ⌈K/32⌉ words) + payload bytes.
- On each valid packet: reject if `sid`, `K`, `chunkSize` or `compressedLen` disagree with the current stream (a different `sid` resets the decoder and starts over). Build the row from `(seed, K)`. Reduce it against the pivot table by repeatedly clearing its lowest set bit with the pivot row for that bit; if it reduces to zero it is dependent → discard; otherwise it becomes the pivot row for its lowest bit and `rank` increases.
- When `rank == K`: back-substitute from the highest pivot down so each pivot row's mask is a single bit, then concatenate the K payloads in index order, truncate to `compressedLen`. (Doing the back-substitution once at the end is the simple, verified approach; eager back-substitution is also valid.)
- Return statuses: `innovative`, `dependent`, `foreign`, `bad`, `done`.
- Cost bound for tests: 200 KB random data (K ≈ 850) decodes in **< 500 ms** in Node [measured earlier in the prototype: ~10–20 ms]. The bound only catches accidental O(K³) code.
- Overhead to expect [MEASURED, Node, random seeds, 300–400 trials], in % of K above K:

| K | median | p90 | p99 |
|---|---|---|---|
| 50 | 6.0 | 22 | 60 |
| 100 | 3.0 | 10–12 | 28–40 |
| 200 | 1.5 | 5–6 | 21–25 |
| 400 | 0.8 | 2.0 | 17.5 |

  About 1 run in 100 needs 20–40% more. **Don't promise a finish time.** Tune `c` only if the p90 at K = 200 exceeds ~8%.

### 6.7 QR rendering (sender)
- `QRCode.create([{ data: bytes, mode: 'byte' }], { errorCorrectionLevel: 'L' })` → `.modules.size`, `.modules.data` (flat `Uint8Array`, 1 = dark), `.version` [VERIFIED].
- Cell width = modules + 8 (4-module quiet zone on every side, white). Cells tile edge to edge on a white background; **no extra gap**; the whole grid is a white square on a dark page.
- Choose an **integer** number of device pixels per module so the grid fits the available square. Canvas pixel size = exact grid size in device pixels; CSS size = canvas size ÷ `devicePixelRatio`. This keeps modules on whole device pixels even at 125%/150% Windows scaling [ESTIMATE — check on your laptop]. Image smoothing off; `image-rendering: pixelated`.
- Draw loop: one `requestAnimationFrame` accumulator at the chosen FPS. `QRCode.create` cost was 2–3.3 ms per packet in the sandbox [MEASURED], so 4 per tick is fine at 10 fps.
- Control panel shows: plan, FPS, K, QR version, device px/module, droplets sent. Tell the user: "brightness 100%, auto-brightness off".

### 6.8 Camera capture and scan (receiver)
- `getUserMedia` with rear camera preferred, **ideal** 1920×1080, 30 fps, no audio. Constraints are requests, not promises: show `track.getSettings()` (width, height, frameRate) in the HUD. Needs HTTPS or localhost; if `window.isSecureContext` is false, show a clear message.
- Per new video frame: crop the central square (side = min(width, height)), split into N×N cells, **pad each cell by ~12%** (clamped to the frame), draw each padded rectangle onto one reusable small canvas, `getImageData`, `jsQR(..., { inversionAttempts: 'dontInvert' })`.
- On a result with `binaryData`: parse, give to the decoder, increment counters in refs.
- Overlay on the live preview: the square, the cell rectangles, green when that cell decoded in the last 500 ms, red otherwise. This is the main tool for fixing framing at G1.
- HUD (refreshed ≤ 4×/s): state, delivered resolution and fps, scan rounds/s, QR decodes/s, rank/K, accepted droplets, dependent droplets, jsQR ms per cell (moving average), elapsed time (stops at completion), progress bar = rank/K.
- jsQR on a ~360×360 cell was 7–18 ms in the sandbox [ESTIMATE from scaled timings]; phone speed is [UNKNOWN]. Nothing here asserts a phone number.

### 6.9 Result handling
After `rank == K`: assemble → `pako.inflate` → CRC32 compare. Success: show size, CRC hex, "CRC OK", detected type by magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, PDF `25 50 44 46`, ZIP `50 4B 03 04`, GIF `47 49 46 38`), an image preview for images, a Save/Open button via a Blob URL (revoke on reset), default name `lumenpipe_received.<ext>`. Failure: state FAILED with the reason, no file offered, and a Retry that resets the decoder (the stream keeps flowing).

## 7. UI Screens
- **Landing (`#/`)**: title, one-line description, two large buttons (Send, Receive), a line saying "no network is used between the two devices; the page itself must be loaded once".
- **Sender (`#/send`)**: dark control bar (file picker, plan, FPS, Start/Stop, Fullscreen, counters) above the white QR grid.
- **Receiver (`#/receive`)**: portrait phone layout: Start button → live preview with overlay → HUD → progress bar → result card.
- Theme (same as the Round 1 deck): background `#0a0f1d`, panel `#121829`, cyan `#00f0ff`, green `#00ff66`, text `#f1f5f9`, muted `#64748b`. Write fresh CSS during the event.

## 8. Acceptance tests (Node unless marked)
| # | Test | Expected |
|---|---|---|
| T1 | Header pack/parse, 1000 random values, plus the known-answer: `sid=0x1234, K=200, seed=0xDEADBEEF, compressedLen=48000, crc32=0xCBF43926` | Bytes are exactly `34 12 c8 00 ef be ad de 80 bb 00 00 26 39 f4 cb`; parse returns the same fields |
| T1b | CRC32 of ASCII `123456789` | `0xCBF43926` [VERIFIED] |
| T2 | Chunking at 1, 2, 239, 240, 241, 5000 bytes | `K = ⌈len/chunkSize⌉`; last chunk zero-padded; join truncates exactly |
| T3 | PRNG known-answer vectors (§6.1); same seed twice gives identical index sets, sorted, no duplicates; degree table in §6.3 within tolerance | Pass |
| T4 | Overhead at K = 50/100/200/400, ≥ 200 trials each, random seeds | Log median/p90/p99; compare with §6.6; tune `c` only if p90 at K=200 > ~8% |
| T5 | Loopback: droplets until rank = K | Every chunk byte-exact |
| T6 | Duplicate droplets and a changed `sid` | Duplicates ignored; `sid` change resets rank to 0 |
| T7 | Full pipeline: 1 KB, 50 KB, 200 KB | Byte-exact after inflate; CRC matches |
| T8 | 40% random drop; shuffled order; burst loss; late joiner; two decoders with different loss on one stream | All reconstruct exactly |
| T9 | **Optical**: Plans A/B/C on a real phone, 30 s each | Record delivered resolution, decodes/s, time to complete; keep the plan that completes fastest |
| T10 | **Optical**: two phones, one stream | Both complete |
| T11 | **Optical**: cover the screen for 5 s mid-transfer | Rank stalls, then resumes; no reset, no error |
| T12 | Corrupt one byte of an assembled payload | Inflate throws or CRC mismatches; FAILED shown; no file offered |
| T13 | Build smoke: `vite build` with pako, qrcode and jsqr imported | Passes [VERIFIED once, in a throwaway project] |

## 9. Gates (decision points; times assume a 13:00 start)
G1 (by 18:00): one QR cell is read in the receiver from the real screen. G2: rank climbs during a stream. If G1 isn't passed by 18:00, downgrade one rung (A → B → C), then darken the room and move closer. The runbook has the full hour-by-hour plan.

## 10. What NOT to build (scope guard)
Web Workers · adaptive bit-rate · encryption (roadmap: AES-GCM with a passphrase) · filename metadata (roadmap) · multi-file or folders · history · accounts · backend · analytics · concentric anchor shapes in the QR margins (QR codes already have finder patterns and anything in the quiet zone risks decode failures) · Tailwind/TypeScript/router/state libraries · any speed number you didn't measure.

## 11. File Structure (create empty, fill stage by stage)
```
index.html
vite.config.js
package.json            (exact pins, scripts: dev build preview test)
public/icon-192.png  public/icon-512.png     (supplied by the user)
src/main.jsx  src/App.jsx  src/styles.css
src/lib/format.js  src/lib/lt.js  src/lib/encoder.js  src/lib/decoder.js
src/lib/pipeline.js  src/lib/plans.js  src/lib/qrdraw.js  src/lib/crop.js  src/lib/sniff.js
src/sender/Sender.jsx
src/receiver/Receiver.jsx
test/*.test.js
CLAUDE.md  DISCLOSURE.md  README.md
```

## 12. Constraints
Free and open-source only · Receiver is mobile-first (portrait) · Sender is desktop landscape, fullscreen-capable · No network needed after the first load · The camera needs HTTPS or localhost · Don't redeploy between the final rehearsal and the judging (a service-worker update could reload the page mid-transfer).

## 13. Open items
Venue start time, internet availability, demo screen type, the organizers' answer on bringing the specification and prompts, delivered camera resolution on each phone, browser (Chrome assumed), whether the event has a minimum commit count: all **[UNKNOWN]**.
