// src/receiver/Receiver.jsx — Camera scanner, HUD, calibration, result card & P10 hardening (spec §6.8, §6.9, prompts P6, P7b, P8, P10)

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Decoder } from '../lib/decoder.js';
import { getCropGeometry } from '../lib/crop.js';
import { assembleFile } from '../lib/pipeline.js';
import { sniffFileType } from '../lib/sniff.js';

function saveFile(bytes, filename, mime) {
  const u8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const blob = new Blob([u8], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function Receiver() {
  const [isSecure, setIsSecure] = useState(true);
  const [gridN, setGridN] = useState(2); // default 2x2 per spec
  const [hudState, setHudState] = useState('IDLE'); // IDLE, STARTING, SEARCHING, STREAMING, COMPLETE, FAILED
  const [failureReason, setFailureReason] = useState('');
  const [foreignNotice, setForeignNotice] = useState('');
  const [deliveredSettings, setDeliveredSettings] = useState({ width: 0, height: 0, frameRate: 0 });
  const [copiedStats, setCopiedStats] = useState(false);

  const [stats, setStats] = useState({
    scanRoundsPerSec: 0,
    decodesPerSec: 0,
    rank: 0,
    K: 0,
    accepted: 0,
    dependent: 0,
    jsqrMsPerCell: 0,
    elapsedSeconds: 0,
    progressPercent: 0
  });

  const [resultData, setResultData] = useState(null); // { bytes, crcHex, sniff }
  const [blobUrl, setBlobUrl] = useState(null);

  const [overlayGeometry, setOverlayGeometry] = useState(null);
  const [activeCellMask, setActiveCellMask] = useState({});

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const decoderRef = useRef(new Decoder());
  const isScanningRef = useRef(false);
  const frameCallbackIdRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const hudTimerRef = useRef(null);
  const wakeLockRef = useRef(null);

  // High-frequency counters stored in refs (no setState inside the scan loop!)
  const scanRoundsCountRef = useRef(0);
  const decodesCountRef = useRef(0);
  const jsqrMsTotalRef = useRef(0);
  const jsqrCallsCountRef = useRef(0);
  const lastCellDecodeTimeRef = useRef({});
  const lastAnyDecodeTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const completionTimeRef = useRef(null);

  // Check secure context on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setIsSecure(false);
    }
  }, []);

  // Create reusable crop canvas on mount
  useEffect(() => {
    cropCanvasRef.current = document.createElement('canvas');
    return () => {
      stopCamera();
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && navigator.wakeLock?.request) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Feature-detected, errors swallowed per prompt P10
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  const startCamera = async () => {
    if (hudState === 'STARTING' || isScanningRef.current) return;
    setHudState('STARTING');
    setFailureReason('');
    setForeignNotice('');
    completionTimeRef.current = null;
    clearResult();

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setHudState('FAILED');
      setFailureReason('Camera requires a secure HTTPS or localhost connection.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHudState('FAILED');
      setFailureReason('Your browser does not support camera access (navigator.mediaDevices is unavailable).');
      return;
    }

    decoderRef.current.reset();
    scanRoundsCountRef.current = 0;
    decodesCountRef.current = 0;
    jsqrMsTotalRef.current = 0;
    jsqrCallsCountRef.current = 0;
    lastCellDecodeTimeRef.current = {};
    lastAnyDecodeTimeRef.current = 0;

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();

        const track = mediaStream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          setDeliveredSettings({
            width: settings.width || 0,
            height: settings.height || 0,
            frameRate: Math.round(settings.frameRate || 0)
          });
        }

        startTimeRef.current = performance.now();
        isScanningRef.current = true;
        setHudState('SEARCHING');

        // Request Screen Wake Lock (P10)
        requestWakeLock();

        // Start scanning loop
        scheduleNextFrame();

        // Start HUD refresh interval (at most 4 times per second: 250 ms)
        startHudTimer();
      }
    } catch (err) {
      setHudState('FAILED');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setFailureReason('Camera permission was denied. Please allow camera access in your browser settings and reload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setFailureReason('No camera device found on this system.');
      } else {
        setFailureReason(`Camera error: ${err.message}`);
      }
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    releaseWakeLock();

    if (frameCallbackIdRef.current) {
      if (videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
        videoRef.current.cancelVideoFrameCallback(frameCallbackIdRef.current);
      } else {
        cancelAnimationFrame(frameCallbackIdRef.current);
      }
      frameCallbackIdRef.current = null;
    }

    if (hudTimerRef.current) {
      clearInterval(hudTimerRef.current);
      hudTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (hudState !== 'COMPLETE' && hudState !== 'FAILED') {
      setHudState('IDLE');
    }
  };

  const clearResult = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setResultData(null);
  };

  const resetAll = () => {
    stopCamera();
    clearResult();
    decoderRef.current.reset();
    setHudState('IDLE');
    setFailureReason('');
    setForeignNotice('');
    setStats({
      scanRoundsPerSec: 0,
      decodesPerSec: 0,
      rank: 0,
      K: 0,
      accepted: 0,
      dependent: 0,
      jsqrMsPerCell: 0,
      elapsedSeconds: 0,
      progressPercent: 0
    });
  };

  const scheduleNextFrame = () => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    if ('requestVideoFrameCallback' in video) {
      frameCallbackIdRef.current = video.requestVideoFrameCallback(scanFrame);
    } else {
      frameCallbackIdRef.current = requestAnimationFrame(scanFrame);
    }
  };

  // Main scan loop — strictly NO setState inside!
  const scanFrame = () => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      scheduleNextFrame();
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      scheduleNextFrame();
      return;
    }

    const { centralSquare, cells } = getCropGeometry(vw, vh, gridN, 0);
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const decoder = decoderRef.current;

    scanRoundsCountRef.current++;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];

      // Resize reusable canvas only when size differs
      if (canvas.width !== cell.width || canvas.height !== cell.height) {
        canvas.width = cell.width;
        canvas.height = cell.height;
      }

      // Draw cropped cell rectangle onto reusable canvas
      ctx.drawImage(
        video,
        cell.x, cell.y, cell.width, cell.height,
        0, 0, cell.width, cell.height
      );

      const imageData = ctx.getImageData(0, 0, cell.width, cell.height);

      // Measure jsQR execution time
      const t0 = performance.now();
      const code = jsQR(imageData.data, cell.width, cell.height, {
        inversionAttempts: 'dontInvert'
      });
      const elapsed = performance.now() - t0;
      jsqrMsTotalRef.current += elapsed;
      jsqrCallsCountRef.current++;

      if (code && code.binaryData && code.binaryData.length > 0) {
        const bytes = new Uint8Array(code.binaryData);
        const status = decoder.add(bytes);
        if (status === 'innovative' || status === 'dependent' || status === 'done') {
          decodesCountRef.current++;
          lastCellDecodeTimeRef.current[i] = performance.now();
          lastAnyDecodeTimeRef.current = performance.now();
        } else if (status === 'foreign') {
          // Different sid mid-transfer (P10)
          lastAnyDecodeTimeRef.current = 0;
        }
      }
    }

    scheduleNextFrame();
  };

  // HUD timer callback — runs 4 times per second (250 ms)
  const startHudTimer = () => {
    let lastScanRounds = 0;
    let lastDecodes = 0;
    let lastTimestamp = performance.now();

    hudTimerRef.current = setInterval(() => {
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      const currentRounds = scanRoundsCountRef.current;
      const currentDecodes = decodesCountRef.current;

      const roundsPerSec = (currentRounds - lastScanRounds) / dt;
      const decodesPerSec = (currentDecodes - lastDecodes) / dt;
      lastScanRounds = currentRounds;
      lastDecodes = currentDecodes;

      const totalCalls = jsqrCallsCountRef.current;
      const avgJsqrMs = totalCalls > 0 ? (jsqrMsTotalRef.current / totalCalls) : 0;

      const decoder = decoderRef.current;
      const rank = decoder.rank;
      const K = decoder.K || 0;
      const accepted = decoder.acceptedCount;
      const dependent = decoder.dependentCount;

      const elapsedSec = completionTimeRef.current !== null
        ? completionTimeRef.current
        : Math.max(0, (now - startTimeRef.current) / 1000);

      const progressPercent = K > 0 ? Math.min(100, Math.round((rank / K) * 100)) : 0;

      // P10 Cover-and-resume check:
      // Show 'SEARCHING' in HUD after 1.5 s without a decode; rank is NOT reset!
      const timeSinceLastDecode = now - lastAnyDecodeTimeRef.current;

      // Update state machine
      if (decoder.isDone) {
        if (completionTimeRef.current === null) {
          completionTimeRef.current = elapsedSec;
          // Assemble and verify file
          try {
            const fileBytes = assembleFile(decoder);
            const crcHex = (decoder.crc32 >>> 0).toString(16).toUpperCase().padStart(8, '0');
            const sniff = sniffFileType(fileBytes);
            const blob = new Blob([fileBytes], { type: sniff.mime });
            const url = URL.createObjectURL(blob);

            setBlobUrl(url);
            setResultData({
              bytes: fileBytes,
              crcHex,
              sniff
            });
            setHudState('COMPLETE');
          } catch (err) {
            setHudState('FAILED');
            setFailureReason(err.message);
          }
          stopCamera();
        }
      } else if (rank > 0 && timeSinceLastDecode < 1500) {
        setHudState('STREAMING');
      } else {
        setHudState('SEARCHING');
      }

      setStats({
        scanRoundsPerSec: Math.round(roundsPerSec * 10) / 10,
        decodesPerSec: Math.round(decodesPerSec * 10) / 10,
        rank,
        K,
        accepted,
        dependent,
        jsqrMsPerCell: Math.round(avgJsqrMs * 10) / 10,
        elapsedSeconds: Math.round(elapsedSec * 10) / 10,
        progressPercent
      });

      // Update overlay green/red state (< 500 ms ago = green)
      const mask = {};
      const totalCells = gridN * gridN;
      for (let i = 0; i < totalCells; i++) {
        const lastDec = lastCellDecodeTimeRef.current[i] || 0;
        mask[i] = (now - lastDec) <= 500;
      }
      setActiveCellMask(mask);

      // Keep overlay geometry in sync with video dimensions
      if (videoRef.current && videoRef.current.videoWidth) {
        const geom = getCropGeometry(
          videoRef.current.videoWidth,
          videoRef.current.videoHeight,
          gridN,
          0
        );
        setOverlayGeometry(geom);
      }
    }, 250);
  };

  // Calibration P7b: Copy stats button
  const copyStats = () => {
    const line = `Grid: ${gridN}×${gridN} | ${deliveredSettings.width}×${deliveredSettings.height} @ ${deliveredSettings.frameRate}fps | decodes/s: ${stats.decodesPerSec} | jsQR: ${stats.jsqrMsPerCell}ms/cell | elapsed: ${stats.elapsedSeconds}s | rank/K: ${stats.rank}/${stats.K}`;
    navigator.clipboard.writeText(line).then(() => {
      setCopiedStats(true);
      setTimeout(() => setCopiedStats(false), 2000);
    }).catch(() => {});
  };

  const [copiedContent, setCopiedContent] = useState(false);

  // Task 1: Decode first ~280 bytes as UTF-8 text for inline verification
  const previewText = React.useMemo(() => {
    if (!resultData?.bytes) return '';
    const slice = resultData.bytes.slice(0, 280);
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(slice);
    } catch {
      return '';
    }
  }, [resultData]);

  // Decode full bytes as UTF-8 for clipboard backup
  const fullText = React.useMemo(() => {
    if (!resultData?.bytes) return '';
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(resultData.bytes);
    } catch {
      return '';
    }
  }, [resultData]);

  const copyToClipboard = () => {
    const text = fullText || previewText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }).catch(() => {});
  };

  // Derive output filename and MIME with lumenpipe-demo.txt fallback
  const isTxtOrBin = !resultData?.sniff?.ext || resultData?.sniff?.ext === 'bin';
  const outputFilename = isTxtOrBin ? 'lumenpipe-demo.txt' : `lumenpipe-demo.${resultData.sniff.ext}`;
  const outputMime = outputFilename.endsWith('.txt') ? 'text/plain' : (resultData?.sniff?.mime || 'text/plain');

  const handleSave = () => {
    if (!resultData?.bytes) return;
    saveFile(resultData.bytes, outputFilename, outputMime);
  };

  return (
    <div className="receiver-page">
      <header className="receiver-header">
        <a href="#/" className="back-link">← Home</a>
        <h2>Receiver</h2>
        <div className={`status-pill status-${hudState.toLowerCase()}`}>
          {hudState}
        </div>
      </header>

      {!isSecure && (
        <div className="alert alert-error">
          ⚠️ Camera requires a secure context (HTTPS or localhost). Please load via HTTPS.
        </div>
      )}

      {foreignNotice && (
        <div className="alert alert-warning">
          {foreignNotice}
        </div>
      )}

      {failureReason && (
        <div className="alert alert-error">
          Transfer Failed: {failureReason}
          <button className="btn-retry" onClick={resetAll}>Retry</button>
        </div>
      )}

      {/* Inline Verification Card per Task 1 & Task 2 */}
      {hudState === 'COMPLETE' && resultData && (
        <div className="result-card verification-card">
          <div className="result-header">
            <span className="result-badge-success">✓ CRC32 VERIFIED</span>
            <span className="result-crc">CRC32: 0x{resultData.crcHex}</span>
          </div>

          <div className="verification-details">
            <div className="verification-row">
              <span className="verification-label">File:</span>
              <strong className="verification-value">{outputFilename}</strong>
            </div>
            <div className="verification-row">
              <span className="verification-label">Size:</span>
              <strong className="verification-value">{resultData.bytes.length.toLocaleString()} bytes</strong>
            </div>
            <div className="verification-row">
              <span className="verification-label">Type:</span>
              <span className="verification-value">{outputMime}</span>
            </div>
          </div>

          <div className="verification-preview-block">
            <div className="verification-preview-header">
              <span>Decoded UTF-8 Text (first ~280 bytes):</span>
              <button
                type="button"
                className="btn-clipboard"
                onClick={copyToClipboard}
              >
                {copiedContent ? '✓ Copied!' : '📋 Copy to clipboard'}
              </button>
            </div>
            <pre className="verification-preview">
              {previewText}
            </pre>
          </div>

          {resultData.sniff.isImage && blobUrl && (
            <div className="result-image-wrapper">
              <img src={blobUrl} alt="Received preview" className="result-preview-img" />
            </div>
          )}

          <div className="result-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
            >
              Save File
            </button>
            <button className="btn btn-secondary" onClick={resetAll}>
              New Transfer
            </button>
          </div>
        </div>
      )}

      <div className="receiver-controls">
        <div className="control-group">
          <label>Grid Mode:</label>
          <div className="btn-group">
            <button
              disabled={isScanningRef.current}
              className={`btn-pill ${gridN === 1 ? 'active' : ''}`}
              onClick={() => setGridN(1)}
            >
              1×1
            </button>
            <button
              disabled={isScanningRef.current}
              className={`btn-pill ${gridN === 2 ? 'active' : ''}`}
              onClick={() => setGridN(2)}
            >
              2×2
            </button>
          </div>
        </div>

        <div className="control-actions">
          {!isScanningRef.current ? (
            <button className="btn btn-primary" onClick={startCamera}>
              Start Scanner
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopCamera}>
              Stop Scanner
            </button>
          )}
          <button className="btn btn-secondary" onClick={copyStats}>
            {copiedStats ? 'Copied!' : 'Copy stats'}
          </button>
          <button className="btn btn-secondary" onClick={resetAll}>
            Reset
          </button>
        </div>
      </div>

      <div className="video-viewport">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          autoPlay
        />

        {overlayGeometry && videoRef.current && (
          <svg
            className="camera-overlay"
            viewBox={`0 0 ${videoRef.current.videoWidth} ${videoRef.current.videoHeight}`}
          >
            {/* Central square crop guide */}
            <rect
              x={overlayGeometry.centralSquare.x}
              y={overlayGeometry.centralSquare.y}
              width={overlayGeometry.centralSquare.width}
              height={overlayGeometry.centralSquare.height}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            {/* Individual cell rectangles with green/red feedback */}
            {overlayGeometry.cells.map((cell, idx) => (
              <rect
                key={idx}
                x={cell.x}
                y={cell.y}
                width={cell.width}
                height={cell.height}
                fill="none"
                stroke={activeCellMask[idx] ? '#00ff66' : '#ff3366'}
                strokeWidth={activeCellMask[idx] ? '3' : '2'}
                opacity={activeCellMask[idx] ? '0.9' : '0.5'}
              />
            ))}
          </svg>
        )}
      </div>

      <div className="hud-panel">
        <div className="hud-progress-container">
          <div
            className="hud-progress-bar"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        <div className="hud-grid">
          <div className="hud-item">
            <span className="hud-label">Camera</span>
            <span className="hud-value">
              {deliveredSettings.width ? `${deliveredSettings.width}×${deliveredSettings.height} @ ${deliveredSettings.frameRate}fps` : '—'}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Rank / K</span>
            <span className="hud-value">
              <strong>{stats.rank}</strong> / {stats.K || '—'} ({stats.progressPercent}%)
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Scan Rounds/s</span>
            <span className="hud-value">{stats.scanRoundsPerSec}</span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Decodes/s</span>
            <span className="hud-value">{stats.decodesPerSec}</span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Accepted / Redundant</span>
            <span className="hud-value">{stats.accepted} / {stats.dependent}</span>
          </div>

          <div className="hud-item">
            <span className="hud-label">jsQR ms/cell</span>
            <span className="hud-value">{stats.jsqrMsPerCell} ms</span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Elapsed Time</span>
            <span className="hud-value">{stats.elapsedSeconds} s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
