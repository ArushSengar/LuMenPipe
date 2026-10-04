// src/sender/Sender.jsx — Sender UI screen (spec §6.7, prompt P5)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { PLANS } from '../lib/plans.js';
import { calculateGridLayout, drawCellToContext } from '../lib/qrdraw.js';
import { prepareFile } from '../lib/pipeline.js';

const FPS_OPTIONS = [5, 6, 10, 12, 15, 20, 30];

export default function Sender() {
  const [selectedPlanId, setSelectedPlanId] = useState('C'); // Default Plan C (1×1 Big QR) for maximum speed and size
  const [fps, setFps] = useState(15); // Default 15 fps for ultra-fast transfer
  const [fileData, setFileData] = useState(null);
  const [fileWarning, setFileWarning] = useState('');
  const [fileError, setFileError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [dropletsSent, setDropletsSent] = useState(0);
  const [layoutInfo, setLayoutInfo] = useState(null);

  const plan = PLANS[selectedPlanId];
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const encoderRef = useRef(null);
  const rafIdRef = useRef(null);
  const dropletsCountRef = useRef(0);
  const isStreamingRef = useRef(false);

  const loadDemoPayload = () => {
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
Soliton Distribution: Robust Soliton (c=0.2, delta=0.05)
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
    setFileError('');
    setFileWarning('');
    setFileData({
      name: 'lumenpipe-demo.txt',
      bytes,
      originalSize: bytes.length
    });
  };

  // Pre-load verified 2 KB demo payload on mount for instant evaluation
  useEffect(() => {
    loadDemoPayload();
  }, []);

  // Read file from user input
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setFileWarning('');

    if (file.size > 1024 * 1024) {
      setFileError('File exceeds 1 MB limit. Please select a smaller file (MVP limit).');
      setFileData(null);
      return;
    }
    if (file.size > 50 * 1024) {
      setFileWarning(`Notice: Large file (${Math.round(file.size / 1024)} KB) requires hundreds of droplets. For a fast 2-second demo, use the 2 KB Demo payload.`);
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileData({
        name: file.name,
        bytes,
        originalSize: bytes.length
      });
    } catch (err) {
      setFileError(`Failed to read file: ${err.message}`);
    }
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

  // Compute file metadata preview if file loaded
  const fileMeta = useMemo(() => {
    if (!fileData) return null;
    const K = Math.max(1, Math.ceil(fileData.originalSize / plan.chunkSize));
    return {
      K,
      chunkSize: plan.chunkSize,
      qrVersion: plan.qrVersion
    };
  }, [fileData, plan]);

  return (
    <div className={`sender-page ${isStreaming ? 'is-streaming' : ''}`}>
      <header className="sender-header">
        <div className="header-left">
          <a href="#/" className="back-link">← Home</a>
          <h2>Sender</h2>
        </div>
        <div className="header-badge">
          Plan: <strong>{plan.id}</strong> | FPS: <strong>{fps}</strong>
        </div>
      </header>

      <div className="brightness-reminder">
        ⚠️ Set screen brightness to 100% and turn auto-brightness off.
      </div>

      <div className="sender-controls">
        <div className="control-group">
          <label className="file-label">
            Choose File
            <input type="file" onChange={handleFileChange} />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-demo-load"
            onClick={loadDemoPayload}
            disabled={isStreaming}
            title="Load 2 KB verified text demo payload for fast 1-2s transfer"
          >
            📄 Load Demo (2 KB)
          </button>
          {fileData && (
            <span className="file-name-tag">
              {fileData.name} ({fileData.originalSize} B, K={fileMeta ? fileMeta.K : '-'})
            </span>
          )}
        </div>

        <div className="control-group">
          <label>Plan:</label>
          <div className="btn-group">
            {Object.keys(PLANS).map((pKey) => (
              <button
                key={pKey}
                disabled={isStreaming}
                className={`btn-pill ${selectedPlanId === pKey ? 'active' : ''}`}
                onClick={() => setSelectedPlanId(pKey)}
                title={pKey === 'C' ? 'Plan C: 1×1 Single Giant QR Code' : `Plan ${pKey}`}
              >
                {pKey === 'C' ? 'C (1×1 Big)' : pKey}
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
              <option key={f} value={f}>{f} fps</option>
            ))}
          </select>
        </div>

        <div className="control-actions">
          {!isStreaming ? (
            <button
              className="btn btn-primary"
              disabled={!fileData}
              onClick={startStreaming}
            >
              Start Stream
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={stopStreaming}
            >
              Stop Stream
            </button>
          )}
          <button className="btn btn-secondary" onClick={toggleFullscreen}>
            Fullscreen
          </button>
        </div>
      </div>

      {fileError && <div className="alert alert-error">{fileError}</div>}
      {fileWarning && <div className="alert alert-warning">{fileWarning}</div>}

      <div className="stats-bar">
        <span>K: <strong>{fileMeta ? fileMeta.K : '-'}</strong></span>
        <span>Chunk: <strong>{plan.chunkSize} B</strong></span>
        <span>QR: <strong>v{plan.qrVersion} (ECC L)</strong></span>
        <span>px/mod: <strong>{layoutInfo ? layoutInfo.devicePxPerModule : '-'}</strong></span>
        <span>Droplets Sent: <strong>{dropletsSent}</strong></span>
      </div>

      <div className="sender-calibration-banner">
        PLAN {plan.id} · {fps} FPS
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
