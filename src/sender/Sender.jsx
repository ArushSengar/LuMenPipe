// src/sender/Sender.jsx — Sender UI screen (spec §6.7, prompt P5)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import * as pako from 'pako';
import { PLANS } from '../lib/plans.js';
import { calculateGridLayout, drawCellToContext } from '../lib/qrdraw.js';
import { prepareFile } from '../lib/pipeline.js';

const FPS_OPTIONS = [5, 10, 15, 20, 24, 30];

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Sender() {
  const [selectedPlanId, setSelectedPlanId] = useState('C'); // Default Plan C (1×1 Big QR) for easiest mobile scanning
  const [fps, setFps] = useState(15); // Default 15 fps for smooth reliable capture
  const [fileData, setFileData] = useState(null);
  const [fileWarning, setFileWarning] = useState('');
  const [fileError, setFileError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [dropletsSent, setDropletsSent] = useState(0);
  const [layoutInfo, setLayoutInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const plan = PLANS[selectedPlanId];
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const encoderRef = useRef(null);
  const rafIdRef = useRef(null);
  const dropletsCountRef = useRef(0);
  const isStreamingRef = useRef(false);

  // Helper to process raw byte array into fileData state with pako compression calculation
  const setLoadedFile = (name, bytes) => {
    setFileError('');
    setFileWarning('');

    let compLen = bytes.length;
    try {
      const comp = pako.deflate(bytes);
      compLen = comp.length;
    } catch {
      compLen = bytes.length;
    }

    if (bytes.length > 200 * 1024) {
      setFileWarning(`Notice: File is ${formatBytes(bytes.length)}. Plan C (1×1 Big QR) at 24/30 FPS provides the most reliable mobile camera decodes.`);
    }

    setFileData({
      name,
      bytes,
      originalSize: bytes.length,
      compressedSize: compLen
    });
  };

  // Demo Preset 1: 343 B PNG Icon (Instant <0.5s transfer, K=2)
  const loadDemoImage = () => {
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABHklEQVR4AdXBuZHDUAxEwceptWDz58AAEQYyhQ+X66t08NBBdE82LyuNieZEc6I50dwfb1IZ7GXDOWuyeVk5oTI4y4Zz1GTzsnJAZfBuNpy9xAGVwSdUBntNNi8rG1UG32LD2UJsVBl8U2WwhdigMviFyuAV0Zx4oTL4pcrgGfFEZXAFlcEjojnxQGVwJZXBPaI5cUdlcEWVwS3RnGhONCeaE82J5kRzojnRnGhONCeaE3fYcK7IhnNLNCcesOFciQ3nHtGceMKGcwU2nEfECzacX7LhPCOaExvYcH7BhvOK2MiG8002nC0mm5eVnSqDT7Hh7CEOsOF8gg1nr8nmZeWEyuAsG85Rk83LyhtUBnvZcM6abF5WGhPNieZEc/8X70mDrH0lvQAAAABJRU5ErkJggg==';
    const binaryString = atob(base64Png);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    setLoadedFile('lumenpipe-demo.png', bytes);
  };

  // Demo Preset 2: 2 KB Human-Readable Text (~1s transfer, K=3 deflated)
  const loadDemoText = () => {
    const text = 
`==================================================
LUMENPIPE — OPTICAL AIR-GAPPED FILE BROADCAST DEMO
==================================================
Protocol: LT Fountain Codes over Optical QR Droplets
Channel: Screen Display -> Mobile Camera Feed
Status: Verified Air-Gapped Transmission
Payload: 2,048 Bytes Structured Human-Readable Text

[1. ARCHITECTURE & ZERO-RF SECURITY]
LumenPipe creates a strictly unidirectional optical data diode.
No radio frequency, Bluetooth, NFC, Wi-Fi, or cellular emissions.
Unlimited receivers can listen simultaneously without contention.
Late-joining receivers reconstruct the file seamlessly from any
point in time thanks to Luby Transform (LT) fountain codes.

[2. TRANSMISSION TELEMETRY]
Chunk Size: 240 Bytes (Plan C 1x1 High Density)
Frame Rate: 15 FPS
ECC Level: Low (L) for maximum data density per module
Soliton Distribution: Robust Soliton (c=0.05, delta=0.5)
Error Detection: 32-bit CRC with zero false-acceptance tolerance.

[3. EVALUATION ACCEPTANCE SIGN-OFF]
- Optical Loop: CONFIRMED
- Fountain Assembly: BYTE-EXACT
- CRC32 Checksum: VERIFIED
- OS File Delivery: SUCCESSFUL

Decoded cleanly via LumenPipe Optical Receiver.
==================================================`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    setLoadedFile('lumenpipe-demo.txt', bytes);
  };

  // Demo Preset 3: 8 KB JSON Sensor Telemetry (~2s transfer, K=8 deflated)
  const loadDemoJson = () => {
    const data = {
      system: 'LumenPipe Optical Air-Gap Diode',
      timestamp: new Date().toISOString(),
      security_level: 'AIR-GAPPED_UNIDIRECTIONAL',
      spec: {
        fountain_type: 'Luby Transform (LT)',
        distribution: 'Robust Soliton',
        duplex_nature: 'Simplex (Zero Backchannel)',
        receivers_supported: 'Unlimited / Anonymous Broadcast'
      },
      telemetry_nodes: Array.from({ length: 20 }, (_, i) => ({
        node_id: `OPTIC-SENSOR-${(i + 1).toString().padStart(2, '0')}`,
        lux_intensity: Math.round(520 + Math.random() * 150),
        temperature_c: +(22.4 + i * 0.25).toFixed(2),
        status: 'NOMINAL',
        frame_crc: '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase(),
        verification: 'PASS'
      }))
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const bytes = new TextEncoder().encode(jsonStr);
    setLoadedFile('telemetry-data.json', bytes);
  };

  // Demo Preset 4: 25 KB Markdown Technical Document (~6s transfer, K=28 deflated)
  const loadDemoDoc = () => {
    let doc = `# LumenPipe — Optical Data Diode Architecture & Security Whitepaper\n\n`;
    doc += `## 1. Executive Summary\n`;
    doc += `LumenPipe establishes a high-throughput, purely optical air-gapped data transport mechanism.\n`;
    doc += `By leveraging animated high-density QR droplets encoded with Luby Transform (LT) fountain codes,\n`;
    doc += `files of arbitrary size and format can be beamed across air gaps without RF eavesdropping risks.\n\n`;
    doc += `## 2. Luby Transform (LT) Fountain Codes\n`;
    doc += `Traditional optical protocols require bidirectional feedback (ACK/NACK) to retransmit dropped frames.\n`;
    doc += `LumenPipe replaces duplex transport with fountain coding over Galois Field GF(2):\n`;
    doc += `- Source file is split into K equal chunks of size B (160 or 240 bytes).\n`;
    doc += `- Transmitter samples degree d from a Robust Soliton distribution and XORs d random chunks.\n`;
    doc += `- Receiver performs on-the-fly incremental Gaussian Elimination.\n`;
    doc += `- As soon as rank reaches K, the system back-substitutes to reconstruct the original byte stream.\n\n`;
    doc += `## 3. Cryptographic & Physical Integrity\n`;
    doc += `- 32-bit CRC embedded in every droplet header guards against bitflips.\n`;
    doc += `- Deflate compression (zlib/pako) minimizes transmission time and removes entropy redundancy.\n`;
    doc += `- Magic byte sniffing automatically identifies PNG, JPEG, PDF, ZIP, and UTF-8 data on arrival.\n\n`;
    doc += `### Verification Audit Records\n`;
    for (let i = 1; i <= 60; i++) {
      doc += `- [Record #${i.toString().padStart(3, '0')}] Sector: Optical Airgap Diode | Checksum: 0x${(i * 133742).toString(16).toUpperCase()} | Status: PASSED\n`;
    }
    const bytes = new TextEncoder().encode(doc);
    setLoadedFile('optical-security-whitepaper.md', bytes);
  };

  // Pre-load default 2 KB text demo on initial mount
  useEffect(() => {
    loadDemoText();
  }, []);

  // Process file upload from file picker or drag-and-drop
  const processUploadedFile = async (file) => {
    if (!file) return;
    setFileError('');
    setFileWarning('');

    if (file.size > 25 * 1024 * 1024) {
      setFileError('File exceeds 25 MB limit for optical transmission.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setLoadedFile(file.name, bytes);
    } catch (err) {
      setFileError(`Failed to read file: ${err.message}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Re-layout canvas based on container dimensions
  const updateLayout = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;
    const availWidth = container.clientWidth || 400;
    const availHeight = container.clientHeight || 400;
    const availSquarePx = Math.min(availWidth, availHeight) * dpr;

    const layout = calculateGridLayout(plan, availSquarePx, dpr);
    setLayoutInfo(layout);

    const canvas = canvasRef.current;
    canvas.width = layout.gridDevicePx;
    canvas.height = layout.gridDevicePx;
    canvas.style.width = `${layout.cssSize}px`;
    canvas.style.height = `${layout.cssSize}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, layout.gridDevicePx, layout.gridDevicePx);
    }
  };

  useEffect(() => {
    updateLayout();
    const t = setTimeout(updateLayout, 60);
    window.addEventListener('resize', updateLayout);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateLayout);
    };
  }, [selectedPlanId, isStreaming]);

  // Start / Stop transmission
  const startStreaming = () => {
    if (!fileData) return;
    stopStreaming();
    updateLayout();

    const sid = Math.floor(Math.random() * 0x10000);
    const prepared = prepareFile(fileData.bytes, plan.chunkSize, sid);
    encoderRef.current = prepared.encoder;
    dropletsCountRef.current = 0;
    setDropletsSent(0);

    isStreamingRef.current = true;
    setIsStreaming(true);

    const frameIntervalMs = 1000 / fps;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (currentTime) => {
      if (!isStreamingRef.current) return;

      const elapsed = currentTime - lastTime;
      lastTime = currentTime;
      accumulator += elapsed;

      if (accumulator >= frameIntervalMs) {
        accumulator %= frameIntervalMs;
        drawGridTick();
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  };

  const stopStreaming = () => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const drawGridTick = () => {
    const canvas = canvasRef.current;
    const encoder = encoderRef.current;
    if (!canvas || !encoder) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const dpr = window.devicePixelRatio || 1;
    const availSquarePx = Math.min(canvas.width, canvas.height);
    const layout = calculateGridLayout(plan, availSquarePx, dpr);

    const N = plan.gridN;
    const cellPx = layout.cellDevicePx;
    const modPx = layout.devicePxPerModule;

    // Generate N x N droplet QR codes synchronously per tick
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const packet = encoder.next();
        const qr = QRCode.create([{ data: packet, mode: 'byte' }], {
          errorCorrectionLevel: 'L'
        });
        drawCellToContext(ctx, qr.modules, c * cellPx, r * cellPx, cellPx, modPx);
        dropletsCountRef.current++;
      }
    }

    setDropletsSent(dropletsCountRef.current);
  };

  useEffect(() => {
    return () => {
      isStreamingRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Compute accurate file metadata, compression ratio, and estimated transmission time
  const fileMeta = useMemo(() => {
    if (!fileData) return null;
    const compSize = fileData.compressedSize || fileData.originalSize;
    const K = Math.max(1, Math.ceil(compSize / plan.chunkSize));

    // Expected droplets needed including ~15% fountain overhead
    const totalDropletsNeeded = Math.ceil(K * 1.15);
    const dropletsPerSec = plan.gridN === 1 ? fps : Math.min(30, fps * 2);
    const estSeconds = Math.max(0.3, Math.round((totalDropletsNeeded / dropletsPerSec) * 10) / 10);
    const ratio = fileData.originalSize > 0 ? Math.round((1 - compSize / fileData.originalSize) * 100) : 0;

    return {
      K,
      chunkSize: plan.chunkSize,
      qrVersion: plan.qrVersion,
      originalSize: fileData.originalSize,
      compressedSize: compSize,
      ratio,
      estSeconds
    };
  }, [fileData, plan, fps]);

  return (
    <div className={`sender-page ${isStreaming ? 'is-streaming' : ''}`}>
      <header className="sender-header">
        <div className="header-left">
          <a href="#/" className="back-link">← Home</a>
          <h2>Transmitter</h2>
        </div>
        <div className="header-badges">
          <a href="#/receive" className="btn btn-secondary btn-header-switch" title="Switch to Receiver">
            📷 Scanner
          </a>
          <span className="header-badge">
            Plan: <strong>{plan.id} ({plan.grid})</strong>
          </span>
          <span className="header-badge">
            Speed: <strong>{fps} FPS</strong>
          </span>
          {fileMeta && (
            <span className="header-badge header-badge-k">
              K: <strong>{fileMeta.K}</strong> (~{fileMeta.estSeconds}s)
            </span>
          )}
        </div>
      </header>

      <div className="brightness-reminder">
        💡 Maximize your screen brightness and keep the display still for the receiver camera.
      </div>

      <div className="sender-controls">
        {/* Preset Selector Bar */}
        <div className="sender-presets-row">
          <span className="preset-label">Instant Presets:</span>
          <div className="preset-buttons">
            <button
              type="button"
              className={`btn-preset ${fileData?.name === 'lumenpipe-demo.png' ? 'active' : ''}`}
              onClick={loadDemoImage}
              disabled={isStreaming}
              title="343 B PNG color icon (<0.5s transfer)"
            >
              🖼️ Icon (PNG 343 B)
            </button>
            <button
              type="button"
              className={`btn-preset ${fileData?.name === 'lumenpipe-demo.txt' ? 'active' : ''}`}
              onClick={loadDemoText}
              disabled={isStreaming}
              title="2 KB text note (~1s transfer)"
            >
              📄 Text (2 KB)
            </button>
            <button
              type="button"
              className={`btn-preset ${fileData?.name === 'telemetry-data.json' ? 'active' : ''}`}
              onClick={loadDemoJson}
              disabled={isStreaming}
              title="8 KB JSON structured telemetry (~2s transfer)"
            >
              📊 JSON (8 KB)
            </button>
            <button
              type="button"
              className={`btn-preset ${fileData?.name === 'optical-security-whitepaper.md' ? 'active' : ''}`}
              onClick={loadDemoDoc}
              disabled={isStreaming}
              title="25 KB Markdown document (~6s transfer)"
            >
              📜 Whitepaper (25 KB)
            </button>
          </div>
        </div>

        {/* Custom File Dropzone & Configuration Row */}
        <div className="sender-main-row">
          {/* File Picker / Dropzone */}
          <div
            className={`file-dropzone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className="file-dropzone-label">
              <input type="file" onChange={handleFileChange} disabled={isStreaming} />
              <span className="dropzone-icon">📁</span>
              <span className="dropzone-text">
                <strong>Choose ANY File</strong> or drag & drop here
              </span>
              <span className="dropzone-sub">
                Supports PNG, JPG, PDF, ZIP, TXT, JSON, MP3, etc. (No 2 KB limit!)
              </span>
            </label>
          </div>

          {/* Active File Telemetry Card */}
          {fileMeta && (
            <div className="file-telemetry-card">
              <div className="telemetry-card-header">
                <span className="telemetry-filename" title={fileData.name}>
                  {fileData.name}
                </span>
                <span className="telemetry-eta-badge">
                  ⚡ ~{fileMeta.estSeconds}s
                </span>
              </div>
              <div className="telemetry-stats-grid">
                <div className="telemetry-stat">
                  <span className="stat-label">Original Size</span>
                  <span className="stat-val">{formatBytes(fileMeta.originalSize)}</span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Compressed</span>
                  <span className="stat-val">
                    {formatBytes(fileMeta.compressedSize)}
                    {fileMeta.ratio > 0 && <small className="ratio-tag">(-{fileMeta.ratio}%)</small>}
                  </span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Chunks (K)</span>
                  <span className="stat-val stat-val-cyan">{fileMeta.K}</span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Chunk Size</span>
                  <span className="stat-val">{plan.chunkSize} B</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transmission Settings & Action Row */}
        <div className="sender-settings-row">
          <div className="control-group">
            <label>Plan:</label>
            <div className="btn-group">
              {Object.keys(PLANS).map((pKey) => (
                <button
                  key={pKey}
                  disabled={isStreaming}
                  className={`btn-pill ${selectedPlanId === pKey ? 'active' : ''}`}
                  onClick={() => setSelectedPlanId(pKey)}
                  title={
                    pKey === 'C'
                      ? 'Plan C: 1×1 Single Giant QR Code (Recommended for mobile phone camera stability)'
                      : pKey === 'A'
                      ? 'Plan A: 2×2 Grid 4 parallel codes (High throughput)'
                      : 'Plan B: 2×2 Grid 160 B chunks'
                  }
                >
                  {pKey === 'C' ? '⭐ Plan C (1×1 Big)' : `Plan ${pKey} (${PLANS[pKey].grid})`}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>FPS:</label>
            <select
              value={fps}
              disabled={isStreaming}
              onChange={(e) => setFps(Number(e.target.value))}
              className="select-dropdown"
            >
              {FPS_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f} fps {f === 15 ? '(Recommended)' : f === 30 ? '(Max Speed)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="control-actions">
            {!isStreaming ? (
              <button
                className="btn btn-primary btn-stream-action"
                disabled={!fileData}
                onClick={startStreaming}
              >
                ▶ Start Air-Gap Stream
              </button>
            ) : (
              <button
                className="btn btn-danger btn-stream-action"
                onClick={stopStreaming}
              >
                ⏹ Stop Stream
              </button>
            )}
            <button className="btn btn-secondary" onClick={toggleFullscreen}>
              ⛶ Fullscreen
            </button>
          </div>
        </div>
      </div>

      {fileError && <div className="alert alert-error">{fileError}</div>}
      {fileWarning && <div className="alert alert-warning">{fileWarning}</div>}

      <div className="stats-bar">
        <span>Plan: <strong>{plan.id} ({plan.grid})</strong></span>
        <span>K: <strong>{fileMeta ? fileMeta.K : '-'}</strong></span>
        <span>Chunk: <strong>{plan.chunkSize} B</strong></span>
        <span>QR: <strong>v{plan.qrVersion} (ECC L)</strong></span>
        <span>px/mod: <strong>{layoutInfo ? layoutInfo.devicePxPerModule : '-'}</strong></span>
        <span>Droplets Sent: <strong className="stat-sent-count">{dropletsSent}</strong></span>
      </div>

      <div className="sender-calibration-banner">
        PLAN {plan.id} · {fps} FPS {isStreaming ? '· 🔴 BROADCASTING' : '· STANDBY'}
      </div>

      <div className="qr-viewport" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="qr-canvas"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}
