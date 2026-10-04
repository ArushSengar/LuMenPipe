# DISCLOSURE — LumenPipe (Vibeathon, Galgotias University)

The event rules require every external API, tool, framework and AI platform to be disclosed. Fill every `[bracket]`; delete lines that don't apply; add anything you used that isn't listed. Commit this file early and update it before submitting.

## Team
[Team name] · [Your name] (BCA, Cyber Security, Galgotias University) · [Teammate name] · Track: [Cyber Security / Open Innovation]

## Open-source libraries and frameworks (exact versions from package.json)
| Package | Version | Used for |
|---|---|---|
| react, react-dom | 19.3.0 | UI |
| vite, @vitejs/plugin-react | 8.3.2, 6.1.1 | build tooling |
| vite-plugin-pwa | 2.0.0 | offline/installable receiver |
| qrcode | 1.5.4 | generating the QR module matrix |
| jsqr | 1.4.0 | decoding QR codes from camera frames |
| pako | 3.0.2 | zlib compression and decompression |
[Add anything else you installed.]

## Algorithms and public snippets
- LT (Luby Transform) fountain codes with a Robust Soliton degree distribution (Luby 2002) — implemented in this repo.
- mulberry32 PRNG (public domain, Tommy Ettinger) — [implemented from the public description / copied from a public snippet: say which].
- CRC-32 (IEEE) — [implemented in this repo].
- [Any other snippet, with its source.]

## Browser APIs
Camera via `getUserMedia`, Canvas 2D, `requestAnimationFrame`, `requestVideoFrameCallback` (where available), Service Worker / Web App Manifest, [Screen Wake Lock if used], [Clipboard API if used].

## Hosting
[Vercel / GitHub Pages / other] — static hosting only. No backend, no database, no third-party API calls at runtime.

## AI platforms and tools used in the development workflow
| Tool | What it was used for |
|---|---|
| Claude (Anthropic) | Before the event: project design discussions, a pre-event prototype of the codec and components with Node tests, the Round 1 presentation and idea text, this specification and prompt kit. During the event: [pair-programming via Claude Code / claude.ai / other — state the tool and what it did]. |
| Arena.ai (Agent Mode) | Original draft of the Round 2 runbook (design notes and checklists, no product code). |
| Gamma.app | First draft of the Round 1 slides. |
| [Editor copilot, ChatGPT, Cursor, etc.] | [what for] |

No AI model runs inside the product. AI was used for development assistance only. All AI output was reviewed and tested by the team.

## Prior work — be exact
- Before the event the team prepared: [a design document and specification; a set of staged prompts; a prototype of the codec and components with Node tests, which was **not** used in this repository]. 
- The application code in this repository was written during the hackathon. The first commit is `[hash]` at `[time]` and the commit history shows the build.
- [If anything from the prototype or any other earlier code was reused, say exactly what, and that the organizers approved it: name and date.]

## Limits we state openly
The optical channel is public: anyone who can see the screen can read the stream. The system verifies integrity (CRC32 and inflate), not confidentiality. Throughput figures in the README were measured on the devices named there and are not general claims.
