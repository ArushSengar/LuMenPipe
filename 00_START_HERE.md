# LumenPipe — Event Kit (v2) · START HERE

**What this is:** the specs, rules and step-by-step prompts for building LumenPipe with an AI coding tool (Claude Code, Cursor, Antigravity, Bolt) during the 8-hour build.
**What this is not:** it contains **no product code**. The code is written by the AI, in your repo, during the event, and disclosed. That is deliberate; see "Rules boundary" below.

---

## Rules boundary — read this first

- The Vibeathon rules you pasted say the project must be developed during the hackathon, complete pre-developed solutions are prohibited, and all AI tools must be disclosed.
- I could not read a clock, so **I don't know whether the build has started.** Do not paste any prompt from `PROMPTS.md` (P0 onwards) into any AI until the organizers have started the build. Specs and rules can be read any time.
- **Ask the organizers once** (wording from the runbook, §1 Q5): *"Before the event we prepared a design document, a specification and a set of prompts, and a prototype of the codec. We will not use the prototype code. May we use the specification and prompts during the build?"* Follow the answer. If the answer is no, don't use the kit: put it away and build from public references.
- **The earlier prototype exists** (codec, sender, receiver, Node tests, from this conversation). It is not in this kit. Don't give it to the AI and don't copy from it. If the organizers approve bringing it **in writing**, tell me and I'll hand it over; it would save you hours. That decision is yours and theirs, not mine.

## Order of use

1. Read `MVP_Architecture_Specification.md` (the contract) and `CLAUDE.md` (the rules). 20 minutes.
2. At build start: create the repo, put `CLAUDE.md` in its root, commit nothing else yet. Open your AI tool, attach `CLAUDE.md`, `MVP_Architecture_Specification.md` and `CLAUDE_BRIEF.txt`.
3. Paste the **Opening message** from `PROMPTS.md`, then **P0**, then each stage in order. Don't skip a stage's gate. Don't paste the next stage until the current one's tests pass.
4. Commit after every green stage (the commit graph is your evidence of building during the event).
5. At the end: `DISCLOSURE.template.md` and `README.template.md` → fill them in with real numbers.

## What "100% complete" means here (and what it can't mean)

Four levels. Each has a pass/fail test, so you always know where you stand.

| Level | Name | Pass condition | Needs a phone? |
|---|---|---|---|
| 1 | **Codec done** | T1–T8, T12 and T13 pass with `npm test`; `npm run build` passes | No |
| 2 | **Optical loop** | **G1**: one QR cell read in the browser from the screen. **G2**: rank climbs during a stream | Yes |
| 3 | **Demo-ready** | The demo payload transfers to **two phones**, CRC OK, ≤ 60 s each; **at least 4 of 5 consecutive attempts succeed** at the taped distance; cover-and-resume works (T11); installed app opens in airplane mode (PWA) | Yes |
| 4 | **Submission-ready** | `DISCLOSURE.md` and `README.md` committed; every number in them came from your HUD; clean-clone build passes; college ID in the bag | No |

"4 of 5" is my proposed bar, not an event rule.

**What nobody can promise:** that Level 2 and 3 will pass. They depend on your two phones' cameras, your laptop screen, the room light and the distance. No document can verify that. The kit's job is to get you to Level 1 quickly and to make Level 2–3 failures diagnosable, with a downgrade ladder (Plan A → B → C) and a hard decision time (G1 by 18:00 if the build starts at 13:00; adjust to the real start).

A slower, honest, working demo beats a faster one that fails or is faked. A pre-recorded or staged demo presented as live is a disqualification risk ("non-functional demos" and "fake submissions" are in the rules).

## Verified vs not verified (4 Oct 2026)

**Verified in a Node sandbox** (the build ran with these exact versions):

| Package | Pinned version | Note |
|---|---|---|
| vite | 8.3.2 | **Needs Node ^20.19 or ≥ 22.12.** Check `node -v` on your laptop now. |
| @vitejs/plugin-react | 6.1.1 | Requires vite ^8 |
| vite-plugin-pwa | 2.0.0 | Generated `sw.js`, `manifest.webmanifest` and a workbox file |
| react, react-dom | 19.3.0 | |
| qrcode | 1.5.4 | |
| jsqr | 1.4.0 | |
| pako | 3.0.2 | Use `import * as pako from 'pako'` (default import failed in Node ESM) |

- A throwaway Vite project with React, the PWA plugin and all three libraries imported **built successfully** (about 400 kB JS). That project is not part of the kit.
- QR byte-mode capacities at ECC L: v8 = 192 B, v10 = 271 B, v12 = 367 B. A 256-byte packet is v10 (57×57); a 176-byte packet is v8.
- Robust Soliton overhead (Node, 400 trials): see the spec §6. Random 32-bit seeds work as well as any scheme tried; a fixed counter from 1 is one fixed draw (+9–11% at K = 100) and is a bad idea.
- Known-answer vectors (mulberry32, CRC32, header bytes) were computed and cross-checked; they're in the spec §9.

**Not verified:** anything involving a real camera or screen. Delivered camera resolution on your phones, jsQR speed on them, PWA install and airplane-mode behaviour, wake-lock support, Windows display-scaling behaviour, and every distance in the runbook's §5. Also not verified: whether Node on your laptop meets Vite 8's requirement, and whether an offline `npm ci` works from your cache (test it).

## Do these before the build starts (no code)

- [ ] `node -v` on the laptop you'll use: must be ^20.19 or ≥ 22.12.
- [ ] Two PNG icons, 192×192 and 512×512 (any image tool; solid `#0a0f1d` with a cyan square is fine) named `icon-192.png` and `icon-512.png`. Chrome generally needs these for the install criteria (not verified here; you'll test in P9).
- [ ] The demo payload: a 20–30 KB PNG, JPEG or PDF (a photo of your own slide works). Copy it to the USB stick.
- [ ] Runbook §2 scanner-app test and §3 infrastructure (HTTPS page on both phones, airplane-mode check). Those are the tests that tell you the real distance.
- [ ] Ask the organizers question 5 above; also ask whether internet is guaranteed and what screen the demo uses.
- [ ] Bag: both phones, chargers, power banks, laptop charger, phone stands or tape, dark cloth, USB stick, hotspot phone, **college ID**.
