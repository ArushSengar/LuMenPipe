// src/sender/Sender.jsx — Sender UI screen (spec §6.7, prompt P5)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { PLANS } from '../lib/plans.js';
import { calculateGridLayout, drawCellToContext } from '../lib/qrdraw.js';
import { prepareFile } from '../lib/pipeline.js';

const FPS_OPTIONS = [5, 6, 10, 12, 15, 20, 30];

export default function Sender() {
  const [selectedPlanId, setSelectedPlanId] = useState('A');
  const [fps, setFps] = useState(10);
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
    if (file.size > 200 * 1024) {
      setFileWarning('Warning: File is over 200 KB. Transfer may take several minutes.');
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
          {fileData && <span className="file-name-tag">{fileData.name} ({fileData.originalSize} B)</span>}
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
