# LumenPipe

Send a file from a laptop screen to many phones using only light. A one-way stream of QR codes, decoded in a web page and rebuilt with fountain codes. No pairing, no feedback to the sender, no radio on the data channel.

Built for Vibeathon, Galgotias University, Round 2.

## How it works
file → compress (zlib) → split into K chunks → LT fountain-code "droplets" → N×N grid of QR codes on screen → phone camera → decode → incremental GF(2) solve → CRC32 + inflate check → file.

- **No ACK/NACK:** a missed code only costs time. Any droplet carries information; order doesn't matter; a phone can join mid-stream.
- **Broadcast:** one stream serves every phone that can see the screen (each needs its own line of sight).
- **Receiver is a web page** (installable PWA); once loaded and cached it works with the radios off.

## Honest limits
- The stream is **public**: anyone who can see the screen can read it. We verify integrity (CRC32 + inflate), not secrecy.
- Small files (KB to low MB), close range, stable phone, decent light.
- Results depend on the camera, the screen and the distance. See the table below.

## Measured results
| Phone | Delivered capture | Plan | Distance | QR decodes/s | File size | Time to complete | Success |
|---|---|---|---|---|---|---|---|
| OnePlus Nord CE 2 Lite | not measured | A | not measured | not measured | not measured | not measured | not measured |
| CMF Phone 2 Pro | not measured | not measured | not measured | not measured | not measured | not measured | not measured |

Two phones at once: not measured.  
Cover-the-screen test (5 s): not measured (simulated in tests).  
Offline (airplane mode, installed app): not measured.  

## Run it
```bash
npm ci
npm test
npm run build
npm run preview     # (camera needs HTTPS or localhost)
```
Sender: `#/send` on the laptop, fullscreen, brightness 100%.  
Receiver: `#/receive` on the phone, grid selector matching the sender's plan.  

## Tech
React, Vite, vite-plugin-pwa, qrcode, jsqr, pako. Versions and every tool, AI platform and prior-work statement are in [DISCLOSURE.md](DISCLOSURE.md).

## Roadmap (not built)
AES-GCM passphrase encryption · filename metadata · Web Worker scanning if profiling shows it is needed · saved calibration profiles per phone model.

## Deploy note
Freeze deploys before judging: a service-worker update could reload the page mid-transfer.
