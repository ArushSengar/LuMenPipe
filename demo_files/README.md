# LumenPipe — Official Test & Demo Files

This directory contains pre-calibrated test files across different file formats, sizes, and compression ratios to demonstrate the full capabilities of the LumenPipe optical air-gapped data diode.

## Test Files Matrix

| File Name | Format | Real Size | Chunks (K) | Recommended Plan | Est. Time | Demo Purpose |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **`01_quick_badge.png`** | Image (PNG) | ~343 B | 2 | Plan C (1×1) | **< 0.5s** | Instant image transfer demo with immediate phone rendering |
| **`02_mission_brief.txt`** | Text (TXT) | ~1.8 KB | 3 | Plan C (1×1) | **~ 1.0s** | Human-readable air-gap mission brief |
| **`03_sensor_telemetry.json`** | JSON | ~6.5 KB | 6 | Plan C (1×1) | **~ 1.5s** | Structured IoT sensor telemetry with auto JSON detection |
| **`04_cargo_manifest.csv`** | Table (CSV) | ~14 KB | 14 | Plan C / Plan A | **~ 3.0s** | 140-row tabular cargo inventory manifest |
| **`05_security_audit.pdf`** | Document (PDF) | ~18 KB | 22 | Plan C / Plan A | **~ 4.5s** | Valid PDF 1.4 report detected via magic bytes (`%PDF`) |
| **`06_technical_whitepaper.md`** | Markdown (MD) | ~32 KB | 32 | Plan C / Plan A | **~ 6.5s** | Full architecture spec with math & telemetry tables |
| **`07_optical_photo.jpg`** | Image (JPEG) | ~53 KB | 90 | Plan C @ 24/30 FPS | **~ 15s** | Real color photo with phone gallery preview |
| **`08_firmware_bundle.zip`** | Archive (ZIP) | ~45 KB | 80 | Plan C @ 24/30 FPS | **~ 15s** | Valid PKZip archive detected via magic bytes (`PK\x03\x04`) |
| **`09_satellite_imagery.png`** | Image (PNG) | ~121 KB | 240 | Plan C @ 30 FPS | **~ 35s** | High-resolution image transfer test |
| **`10_stress_test_log.json`** | JSON | ~185 KB | 340 | Plan C @ 30 FPS | **~ 45s** | High-volume stress test demonstrating sustained fountain stream |

## How to Test

1. Open the **Transmitter** ([https://lumenpipe-demo.netlify.app/#/send](https://lumenpipe-demo.netlify.app/#/send)).
2. Drag & drop any of the files above into the dropzone (or click **"Choose ANY File"** and browse to this `demo_files` folder).
3. The UI will instantly display the file's original size, deflated size, fountain chunks ($K$), and estimated transfer time.
4. Select **Plan C (1×1 Big QR)** for easiest camera scan.
5. Click **"▶ Start Air-Gap Stream"**.
6. On your phone, open the **Receiver** ([https://lumenpipe-demo.netlify.app/#/receive](https://lumenpipe-demo.netlify.app/#/receive)) and point the camera at the laptop display.
7. Upon completion, the file is verified via CRC-32 and available for instant download!
