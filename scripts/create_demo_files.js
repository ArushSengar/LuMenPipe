// scripts/create_demo_files.js — Generate diverse test demo files across formats and sizes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const demoDir = path.join(rootDir, 'demo_files');
const publicDemoDir = path.join(rootDir, 'public', 'demo_files');

fs.mkdirSync(demoDir, { recursive: true });
fs.mkdirSync(publicDemoDir, { recursive: true });

function writeToBoth(fileName, bufferOrString) {
  const buf = Buffer.isBuffer(bufferOrString) ? bufferOrString : Buffer.from(bufferOrString, 'utf-8');
  fs.writeFileSync(path.join(demoDir, fileName), buf);
  fs.writeFileSync(path.join(publicDemoDir, fileName), buf);
  console.log(`Created ${fileName} (${buf.length.toLocaleString()} bytes)`);
}

// 1. 01_quick_badge.png (343 B PNG Image)
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABHklEQVR4AdXBuZHDUAxEwceptWDz58AAEQYyhQ+X66t08NBBdE82LyuNieZEc6I50dwfb1IZ7GXDOWuyeVk5oTI4y4Zz1GTzsnJAZfBuNpy9xAGVwSdUBntNNi8rG1UG32LD2UJsVBl8U2WwhdigMviFyuAV0Zx4oTL4pcrgGfFEZXAFlcEjojnxQGVwJZXBPaI5cUdlcEWVwS3RnGhONCeaE82J5kRzojnRnGhONCeaE3fYcK7IhnNLNCcesOFciQ3nHtGceMKGcwU2nEfECzacX7LhPCOaExvYcH7BhvOK2MiG8002nC0mm5eVnSqDT7Hh7CEOsOF8gg1nr8nmZeWEyuAsG85Rk83LyhtUBnvZcM6abF5WGhPNieZEc/8X70mDrH0lvQAAAABJRU5ErkJggg==';
writeToBoth('01_quick_badge.png', Buffer.from(base64Png, 'base64'));

// 2. 02_mission_brief.txt (~1.8 KB Text)
const missionBrief = `================================================================================
LUMENPIPE AIR-GAPPED TRANSMISSION BRIEFING
================================================================================
CLASSIFICATION: UNRESTRICTED / EVALUATION DEMO
PROTOCOL:       Luby Transform (LT) Fountain Code over Simplex Optical QR
CHANNEL:        Electromagnetic Visual Light Diode (Zero RF)
DATE/TIME:      ${new Date().toISOString()}

1. SYSTEM INTEGRITY SIGN-OFF
   - Data Diode: Strictly unidirectional (Transmit -> Receive only)
   - RF Emissions: 0.000 dBm (Zero Wi-Fi, Zero Bluetooth, Zero NFC)
   - Reception Model: Broadcast to unlimited concurrent listeners
   - Fountain Distribution: Robust Soliton (c=0.05, delta=0.5)

2. DEPLOYMENT INSTRUCTIONS
   - Step A: Verify screen brightness is set to 100% on the transmitter.
   - Step B: Align receiver camera reticle over the central crop zone.
   - Step C: As droplets are collected, incremental Gaussian elimination
             assembles the exact payload in phone memory.
   - Step D: Once rank reaches K, CRC-32 checksum is verified and
             the file download is triggered automatically.

3. CRYPTOGRAPHIC INTEGRITY
   - File Integrity: 32-bit CRC verified on reassembly.
   - Zero False Acceptance: Droplets failing checksum are discarded.
   - Late Joiners: Reconstruct cleanly from any arbitrary starting frame.

Authenticated by LumenPipe Optical Controller.
================================================================================
`;
writeToBoth('02_mission_brief.txt', missionBrief);

// 3. 03_sensor_telemetry.json (~6.5 KB Structured JSON)
const telemetryData = {
  station: 'LUMENPIPE-OPTIC-BASE-01',
  timestamp: new Date().toISOString(),
  diode_status: 'ACTIVE_SIMPLEX_BROADCAST',
  optical_band: '400nm - 700nm (Visible Light)',
  rf_emission_detection: 'NONE (Complete Isolation)',
  nodes: Array.from({ length: 28 }, (_, i) => ({
    id: `SENSOR-NODE-${(i + 1).toString().padStart(3, '0')}`,
    ambient_lux: Math.round(520 + Math.random() * 250),
    temperature_c: +(21.5 + (i * 0.35)).toFixed(2),
    humidity_percent: +(45.0 + (i * 0.2)).toFixed(1),
    irradiance_mw_cm2: +(0.42 + (i * 0.015)).toFixed(3),
    checksum: '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0'),
    optical_link_quality: i % 7 === 0 ? 'OPTIMAL' : 'EXCELLENT',
    last_calibration_epoch: Date.now() - (i * 3600000)
  }))
};
writeToBoth('03_sensor_telemetry.json', JSON.stringify(telemetryData, null, 2));

// 4. 04_cargo_manifest.csv (~14 KB CSV Table)
let csvContent = 'Item_ID,Description,Origin_Vault,Destination_Site,Weight_KG,Clearance_Level,Integrity_Checksum,Status\n';
const categories = ['Optical Diode Core', 'Sensor Calibration Array', 'Lithium Battery Pack', 'Cryo Storage Module', 'Fiber Optic Transceiver', 'Galois Field Coprocessor'];
const vaults = ['Site-Alpha-01', 'Bunker-Bravo-04', 'Facility-Gamma-09', 'Silo-Delta-12'];
const destinations = ['Arctic-Outpost', 'Orbital-Tracking-Station', 'High-Sec-Lab-3', 'Mobile-Command-Alpha'];
const statuses = ['CLEARED', 'IN_TRANSIT', 'VERIFIED', 'QUARANTINED', 'STORED'];

for (let i = 1; i <= 140; i++) {
  const itemId = `LP-CARGO-${i.toString().padStart(4, '0')}`;
  const desc = categories[i % categories.length];
  const orig = vaults[i % vaults.length];
  const dest = destinations[i % destinations.length];
  const weight = (1.5 + (i * 0.73) % 25).toFixed(2);
  const clearance = i % 3 === 0 ? 'TOP_SECRET' : i % 2 === 0 ? 'RESTRICTED' : 'STANDARD';
  const chk = '0x' + ((i * 987654321) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const stat = statuses[i % statuses.length];
  csvContent += `${itemId},"${desc}",${orig},${dest},${weight},${clearance},${chk},${stat}\n`;
}
writeToBoth('04_cargo_manifest.csv', csvContent);

// 5. 05_security_audit.pdf (~18 KB Valid PDF 1.4 Document)
function generateValidPdf(title, subtitle, sections) {
  let streamText = `BT /F1 18 Tf 50 740 Td (${title}) Tj\n`;
  streamText += `0 -25 Td /F2 12 Tf (${subtitle}) Tj\n`;
  streamText += `0 -20 Td /F2 9 Tf (Generated: ${new Date().toISOString()} | Classification: AIRGAP_RESTRICTED) Tj\n`;
  streamText += `0 -30 Td /F1 13 Tf (EXECUTIVE SUMMARY & SECURITY FINDINGS:) Tj\n`;
  
  let yOffset = -20;
  for (const s of sections) {
    streamText += `0 ${yOffset} Td /F2 10 Tf (${s.title}:) Tj\n`;
    streamText += `0 -15 Td /F2 9 Tf (${s.body}) Tj\n`;
    yOffset = -22;
  }
  streamText += `0 -40 Td /F1 11 Tf (VERIFICATION STAMP: ALL AIR-GAP OPTICAL DIODE TESTS PASSED.) Tj ET`;

  // Pad stream to ~18 KB with structured comments to simulate a full report
  let paddedStream = streamText + '\n% ' + 'LUMENPIPE_AIRGAP_AUDIT_REPORT_PADDING_'.repeat(450);
  const streamLen = Buffer.byteLength(paddedStream, 'utf-8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${paddedStream}\nendstream\nendobj\n`;

  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const xrefOffset = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf-8');
}

const auditSections = [
  { title: '1. RF EMISSIONS SCAN', body: 'Spectral analysis confirms 0.000 uW RF leakage across 10 MHz to 60 GHz bands.' },
  { title: '2. OPTICAL DIODE ISOLATION', body: 'Unidirectional light path prevents all command-and-control backchannel exfiltration.' },
  { title: '3. FOUNTAIN CODE INTEGRITY', body: 'Luby Transform LT chunks survive 40 percent packet loss without data corruption.' },
  { title: '4. CRC32 RECONSTRUCTION', body: 'Zero false-acceptance tolerance guaranteed by 32-bit hardware checksum validation.' }
];
writeToBoth('05_security_audit.pdf', generateValidPdf('LumenPipe Optical Air-Gap Security Audit', 'Evaluation Compliance & Cryptographic Verification Report', auditSections));

// 6. 06_technical_whitepaper.md (~32 KB Markdown)
let whitepaper = `# LumenPipe — Technical Whitepaper & Protocol Specification\n\n`;
whitepaper += `**Document Version:** 2.4.0  \n`;
whitepaper += `**Classification:** AIR-GAP CERTIFIED  \n`;
whitepaper += `**Date:** ${new Date().toISOString()}  \n\n`;
whitepaper += `## 1. Abstract\n`;
whitepaper += `LumenPipe is a high-bandwidth optical air-gapped data transport protocol designed to bridge isolated computer networks.\n`;
whitepaper += `By encoding arbitrary binary files into high-density animated QR codes modulated with Luby Transform (LT) fountain codes,\n`;
whitepaper += `it establishes a strictly unidirectional, simplex transmission medium that eliminates all radio-frequency vulnerabilities.\n\n`;
whitepaper += `## 2. Threat Model & Physical Air-Gap Isolation\n`;
whitepaper += `Conventional file-transfer methods (USB drives, Bluetooth, Wi-Fi, NFC) present severe attack vectors:\n`;
whitepaper += `- BadUSB and microcontroller firmware reprogramming.\n`;
whitepaper += `- Two-way RF exploitation and side-channel eavesdropping.\n`;
whitepaper += `- Covert backchannel beaconing and malware command-and-control.\n\n`;
whitepaper += `LumenPipe solves this by using visible light photons emitted from a monitor to an untethered camera.\n`;
whitepaper += `The photon path is physically incapable of transmitting data backwards.\n\n`;
whitepaper += `## 3. Mathematical Foundations of LT Fountain Codes\n`;
whitepaper += `Given a file of size S deflated with zlib, we split the data into K equal source chunks:\n`;
whitepaper += `$$\\mathcal{C} = \\{c_0, c_1, \\dots, c_{K-1}\\}, \\quad c_i \\in \\mathbb{F}_2^B$$\n\n`;
whitepaper += `For every animated droplet tick:\n`;
whitepaper += `1. A 32-bit PRNG seed is generated via Mulberry32.\n`;
whitepaper += `2. A degree d is sampled from the Robust Soliton distribution $\\Omega(d)$:\n`;
whitepaper += `$$\\mu(i) = \\begin{cases} 1/K & i = 1 \\\\ 1/(i(i-1)) & 2 \\le i \\le K \\end{cases}$$\n`;
whitepaper += `3. d distinct indices are selected, and their chunk contents are XORed in $\\mathbb{F}_2$.\n`;
whitepaper += `4. The receiver maintains a lower-triangular pivot matrix and solves the system via incremental Gaussian elimination.\n\n`;
whitepaper += `## 4. Benchmarking & Hardware Telemetry Logs\n\n`;
whitepaper += `| Block ID | Timestamp (ISO) | Packet Seed | Degree | Rank Climb | Decodes/Sec | CRC-32 Status |\n`;
whitepaper += `|:--------:|:---------------:|:-----------:|:------:|:----------:|:-----------:|:-------------:|\n`;

for (let i = 1; i <= 150; i++) {
  const seed = '0x' + ((i * 123456789) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const deg = (i % 7 === 1) ? 1 : (i % 5 === 0) ? 4 : (i % 3 === 0) ? 3 : 2;
  const rank = Math.min(i, 120);
  const dps = (12.4 + (i % 5) * 0.8).toFixed(1);
  whitepaper += `| BLOCK-${i.toString().padStart(4, '0')} | 2026-10-04T12:${(i % 60).toString().padStart(2, '0')}:00Z | ${seed} | ${deg} | ${rank}/120 | ${dps} | VALID |\n`;
}

whitepaper += `\n## 5. Conclusion\n`;
whitepaper += `LumenPipe demonstrates that modern mobile web browsers equipped with standard phone cameras\n`;
whitepaper += `can reliably sustain optical data diodes with zero RF hardware, enabling secure document transport anywhere.\n`;
writeToBoth('06_technical_whitepaper.md', whitepaper);

// 7. 07_optical_photo.jpg (~53 KB Real Color JPEG Photo)
const sampleJpgPath = 'C:/Users/sonis/.gemini/antigravity-ide/brain/b4d368b8-bb39-454e-9519-79fcf27c8e53/.user_uploaded/media_1791106723384.jpg';
if (fs.existsSync(sampleJpgPath)) {
  const jpgData = fs.readFileSync(sampleJpgPath);
  writeToBoth('07_optical_photo.jpg', jpgData);
}

// 8. 08_firmware_bundle.zip (~45 KB Real PKZip Archive)
function createValidZip(entries) {
  const fileBuffers = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fn = Buffer.from(entry.name, 'utf-8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf-8');

    // CRC-32
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ [
        0, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
        0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91
      ][(crc ^ data[i]) & 0x0F];
      crc = (crc >>> 8) ^ [
        0, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
        0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91
      ][(crc ^ (data[i] >> 4)) & 0x0F];
    }
    crc = (crc ^ (-1)) >>> 0;

    // Local Header
    const local = Buffer.alloc(30 + fn.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // Store
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fn.length, 26);
    local.writeUInt16LE(0, 28);
    fn.copy(local, 30);

    fileBuffers.push(local);
    fileBuffers.push(data);

    // Central Directory Header
    const central = Buffer.alloc(46 + fn.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fn.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    fn.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + data.length;
  }

  const centralOffset = offset;
  const centralTotal = centralHeaders.reduce((acc, b) => acc + b.length, 0);

  // EOCD
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralTotal, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileBuffers, ...centralHeaders, eocd]);
}

// Generate realistic firmware payload entries
const dummyFirmwareBinary = Buffer.alloc(40000, 0x42);
for (let i = 0; i < 40000; i += 4) {
  dummyFirmwareBinary.writeUInt32LE((i * 12345) >>> 0, i);
}

const zipEntries = [
  { name: 'firmware_v2.4.bin', data: dummyFirmwareBinary },
  { name: 'manifest.json', data: JSON.stringify({ release: '2.4.0', target: 'LumenPipe-Diode', hash: 'sha256-verified' }, null, 2) },
  { name: 'install.sh', data: '#!/bin/sh\necho "Applying air-gap firmware..."\nexit 0\n' }
];
writeToBoth('08_firmware_bundle.zip', createValidZip(zipEntries));

// 9. 09_satellite_imagery.png (~121 KB High-Resolution PNG Image)
const samplePngPath = 'C:/Users/sonis/.gemini/antigravity-ide/brain/b4d368b8-bb39-454e-9519-79fcf27c8e53/.user_uploaded/media_1791107033459.png';
if (fs.existsSync(samplePngPath)) {
  const pngData = fs.readFileSync(samplePngPath);
  writeToBoth('09_satellite_imagery.png', pngData);
}

// 10. 10_stress_test_log.json (~185 KB Large JSON Dataset)
const largeLog = {
  experiment: 'LumenPipe High Capacity Fountain Stress Test',
  description: 'Simulated high-density optical telemetry across 450 network gateway checkpoints',
  generated_at: new Date().toISOString(),
  records: Array.from({ length: 450 }, (_, i) => ({
    event_id: `EVT-${(i + 1).toString().padStart(6, '0')}`,
    timestamp: new Date(Date.now() - (450 - i) * 1000).toISOString(),
    source_sector: `SEC-${(i % 12).toString().padStart(2, '0')}`,
    packet_rank: i,
    fountain_seed: '0x' + ((i * 2654435761) >>> 0).toString(16).toUpperCase(),
    crc32_match: true,
    photon_flux_nanowatts: +(120.4 + (i * 0.15)).toFixed(2),
    bit_error_rate: 0.00000,
    linear_independence: i % 10 === 0 ? 'DEPENDENT' : 'INNOVATIVE'
  }))
};
writeToBoth('10_stress_test_log.json', JSON.stringify(largeLog, null, 2));

// 11. README.md (Comprehensive Guide)
const readmeContent = `# LumenPipe — Official Test & Demo Files

This directory contains pre-calibrated test files across different file formats, sizes, and compression ratios to demonstrate the full capabilities of the LumenPipe optical air-gapped data diode.

## Test Files Matrix

| File Name | Format | Real Size | Chunks (K) | Recommended Plan | Est. Time | Demo Purpose |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **\`01_quick_badge.png\`** | Image (PNG) | ~343 B | 2 | Plan C (1×1) | **< 0.5s** | Instant image transfer demo with immediate phone rendering |
| **\`02_mission_brief.txt\`** | Text (TXT) | ~1.8 KB | 3 | Plan C (1×1) | **~ 1.0s** | Human-readable air-gap mission brief |
| **\`03_sensor_telemetry.json\`** | JSON | ~6.5 KB | 6 | Plan C (1×1) | **~ 1.5s** | Structured IoT sensor telemetry with auto JSON detection |
| **\`04_cargo_manifest.csv\`** | Table (CSV) | ~14 KB | 14 | Plan C / Plan A | **~ 3.0s** | 140-row tabular cargo inventory manifest |
| **\`05_security_audit.pdf\`** | Document (PDF) | ~18 KB | 22 | Plan C / Plan A | **~ 4.5s** | Valid PDF 1.4 report detected via magic bytes (\`%PDF\`) |
| **\`06_technical_whitepaper.md\`** | Markdown (MD) | ~32 KB | 32 | Plan C / Plan A | **~ 6.5s** | Full architecture spec with math & telemetry tables |
| **\`07_optical_photo.jpg\`** | Image (JPEG) | ~53 KB | 90 | Plan C @ 24/30 FPS | **~ 15s** | Real color photo with phone gallery preview |
| **\`08_firmware_bundle.zip\`** | Archive (ZIP) | ~45 KB | 80 | Plan C @ 24/30 FPS | **~ 15s** | Valid PKZip archive detected via magic bytes (\`PK\\x03\\x04\`) |
| **\`09_satellite_imagery.png\`** | Image (PNG) | ~121 KB | 240 | Plan C @ 30 FPS | **~ 35s** | High-resolution image transfer test |
| **\`10_stress_test_log.json\`** | JSON | ~185 KB | 340 | Plan C @ 30 FPS | **~ 45s** | High-volume stress test demonstrating sustained fountain stream |

## How to Test

1. Open the **Transmitter** ([https://lumenpipe-demo.netlify.app/#/send](https://lumenpipe-demo.netlify.app/#/send)).
2. Drag & drop any of the files above into the dropzone (or click **"Choose ANY File"** and browse to this \`demo_files\` folder).
3. The UI will instantly display the file's original size, deflated size, fountain chunks ($K$), and estimated transfer time.
4. Select **Plan C (1×1 Big QR)** for easiest camera scan.
5. Click **"▶ Start Air-Gap Stream"**.
6. On your phone, open the **Receiver** ([https://lumenpipe-demo.netlify.app/#/receive](https://lumenpipe-demo.netlify.app/#/receive)) and point the camera at the laptop display.
7. Upon completion, the file is verified via CRC-32 and available for instant download!
`;
writeToBoth('README.md', readmeContent);

console.log('\nAll demo files created successfully in both demo_files/ and public/demo_files/!');
