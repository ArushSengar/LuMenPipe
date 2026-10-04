import React from 'react';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-badge">
          <span className="pulse-dot"></span> AIR-GAPPED OPTICAL DATA DIODE
        </div>
        <h1 className="landing-title">LumenPipe</h1>
        <p className="landing-desc">
          High-throughput, strictly unidirectional file broadcast from screen to camera.
          Powered by animated QR droplets, Galois Field GF(2) math, and Luby Transform (LT) fountain codes.
        </p>

        <div className="landing-feature-chips">
          <span className="chip">🔒 Zero-RF Isolation</span>
          <span className="chip">🌊 LT Fountain Codes</span>
          <span className="chip">👥 Unlimited Receivers</span>
          <span className="chip">📁 Any File Type (No Limits)</span>
        </div>
      </div>

      <div className="landing-cards-grid">
        {/* Transmitter Card */}
        <div className="landing-portal-card">
          <div className="card-icon">⚡</div>
          <h2 className="card-title">Transmitter</h2>
          <p className="card-desc">
            Broadcast any file from your laptop or desktop display.
            Includes 1-click demo presets (PNG image, Text, JSON telemetry, Whitepaper doc)
            or upload any custom file up to 25 MB.
          </p>
          <ul className="card-highlights">
            <li>✓ Plan C (1×1 Single Giant QR) for easiest mobile focus</li>
            <li>✓ Plan A & B (2×2 Parallel Grids) for maximum throughput</li>
            <li>✓ Real-time compression & ETA estimation</li>
          </ul>
          <a href="#/send" className="btn btn-primary btn-portal">
            ▶ Launch Transmitter (Send)
          </a>
        </div>

        {/* Receiver Card */}
        <div className="landing-portal-card">
          <div className="card-icon">📷</div>
          <h2 className="card-title">Receiver</h2>
          <p className="card-desc">
            Point your mobile camera at the animated screen to capture QR droplets.
            Incremental Gaussian elimination reconstructs the file byte-for-byte.
          </p>
          <ul className="card-highlights">
            <li>✓ Automatic camera calibration & live HUD telemetry</li>
            <li>✓ Magic-byte sniffing: PNG, JPEG, PDF, ZIP, JSON, MD</li>
            <li>✓ 1-click file download & instant image preview</li>
          </ul>
          <a href="#/receive" className="btn btn-secondary btn-portal">
            📷 Launch Receiver (Scan)
          </a>
        </div>
      </div>

      <div className="landing-footer-note">
        Works 100% offline once loaded · Client-side WebAssembly & Pure JavaScript · Zero telemetry tracking
      </div>
    </div>
  );
}
