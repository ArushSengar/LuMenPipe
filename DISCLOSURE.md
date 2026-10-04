# DISCLOSURE — LumenPipe (Vibeathon, Galgotias University)

## Team
LumenPipe Team · Galgotias University · Track: Cyber Security / Open Innovation

## Open-source libraries and frameworks (exact versions from package.json)
| Package | Version | Used for |
|---|---|---|
| react, react-dom | 19.3.0 | UI components and rendering |
| vite, @vitejs/plugin-react | 8.3.2, 6.1.1 | build tooling and development server |
| vite-plugin-pwa | 2.0.0 | offline/installable receiver service worker |
| qrcode | 1.5.4 | generating the QR module matrix |
| jsqr | 1.4.0 | decoding QR codes from camera frames |
| pako | 3.0.2 | zlib compression and decompression |

## Algorithms and public snippets
- LT (Luby Transform) fountain codes with a Robust Soliton degree distribution (Luby 2002) — implemented from scratch in this repo (`src/lib/lt.js`, `src/lib/encoder.js`, `src/lib/decoder.js`).
- mulberry32 PRNG (public domain, Tommy Ettinger) — implemented in `src/lib/lt.js`.
- CRC-32 (IEEE 802.3) — lookup table algorithm implemented in `src/lib/format.js`.
- GF(2) incremental Gaussian elimination with upper triangular pivot table and back-substitution — implemented in `src/lib/decoder.js`.

## Browser APIs
Camera via `getUserMedia`, Canvas 2D (`willReadFrequently: true`), `requestAnimationFrame`, `requestVideoFrameCallback` (where available), Service Worker / Web App Manifest (PWA), Screen Wake Lock API (feature-detected), Clipboard API (Copy stats).

## Hosting
Static hosting only (e.g. Vercel, GitHub Pages, or Netlify). No backend, no database, no third-party API calls at runtime.

## AI platforms and tools used in the development workflow
| Tool | What it was used for |
|---|---|
| Claude (Anthropic) / Antigravity | Pair programming throughout the hackathon: writing tests first, implementing lib modules, UI components, hardening and audit against specification. |
| Arena.ai (Agent Mode) | Initial draft notes for runbook and checklists. |
| Gamma.app | Round 1 deck draft. |

No AI model runs inside the product at runtime. AI was used for development assistance only. All AI output was systematically verified and tested with automated unit and integration tests.

## Prior work
- Before the event, the team prepared the architecture specification, prompt kit, and conceptual design.
- All active application code in this repository was written during the hackathon. The first skeleton commit is `80708ba`, and the commit history traces every stage chronologically.

## Limits we state openly
The optical channel is public: anyone who can see the screen can read the stream. The system verifies integrity (CRC32 and inflate), not confidentiality. Throughput figures are strictly those measured in tests and real device environments.
