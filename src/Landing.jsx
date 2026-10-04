import React from 'react';

export default function Landing() {
  return (
    <div className="landing-container">
      {/* Top Navigation Bar */}
      <header className="landing-header">
        <div className="landing-brand">
          <div className="brand-icon">
            <span className="beam-glow"></span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">LumenPipe</span>
            <span className="brand-tag">OPTICAL BROADCAST</span>
          </div>
        </div>

        <div className="header-status">
          <span className="pulse-indicator"></span>
          <span className="status-label">AIR-GAP OPTICAL LINK ACTIVE</span>
        </div>

        <nav className="header-nav">
          <a href="#/send" className="nav-btn nav-btn-cyan">Transmitter</a>
          <a href="#/receive" className="nav-btn nav-btn-green">Receiver</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-eyebrow">
          <span className="eyebrow-chip">VIBEATHON ROUND 2</span>
          <span className="eyebrow-divider">//</span>
          <span className="eyebrow-text">UNIDIRECTIONAL PHOTONIC TRANSMISSION SYSTEM</span>
        </div>

        <h1 className="hero-headline">
          Zero Radios. Zero Pairing.<br />
          <span className="gradient-text">Pure Optical Broadcast.</span>
        </h1>

        <p className="hero-description">
          Transmit files across physical air-gaps to multiple smartphone cameras simultaneously 
          using high-speed QR droplet matrices and <strong>Luby Transform (LT) fountain codes</strong>. 
          No Wi-Fi, no Bluetooth, no feedback channel required.
        </p>

        {/* Telemetry Feature Chips */}
        <div className="hero-telemetry-chips">
          <div className="telemetry-chip">
            <span className="chip-bullet cyan"></span>
            <span className="chip-title">Air-Gap Isolated</span>
            <span className="chip-sub">Zero RF Emission</span>
          </div>
          <div className="telemetry-chip">
            <span className="chip-bullet green"></span>
            <span className="chip-title">Fountain Codes</span>
            <span className="chip-sub">Rateless & Order-Free</span>
          </div>
          <div className="telemetry-chip">
            <span className="chip-bullet purple"></span>
            <span className="chip-title">1 → ∞ Receivers</span>
            <span className="chip-sub">Simultaneous Broadcast</span>
          </div>
          <div className="telemetry-chip">
            <span className="chip-bullet orange"></span>
            <span className="chip-title">Zero Install PWA</span>
            <span className="chip-sub">Runs Offline in Browser</span>
          </div>
        </div>
      </section>

      {/* Dual Mode Launch Cards */}
      <section className="landing-modes">
        {/* Mode 1: Transmitter */}
        <div className="mode-card card-transmitter">
          <div className="card-ambient-glow cyan"></div>
          <div className="card-header">
            <div className="mode-badge cyan">TRANSMITTER CONSOLE</div>
            <span className="mode-device">Laptop / Desktop Screen</span>
          </div>

          <div className="card-icon-wrap cyan">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>

          <h2 className="mode-title">Send Stream</h2>
          <p className="mode-desc">
            Load any document, photo or payload. Compresses with Deflate, computes CRC-32, 
            and broadcasts an infinite animated stream of fountain code droplets at up to 30 FPS.
          </p>

          <ul className="mode-features">
            <li>
              <span className="feature-check cyan">✓</span>
              <span><strong>Pure Integer Pixel Drawing:</strong> Sharp rasterization without antialiasing artifacts</span>
            </li>
            <li>
              <span className="feature-check cyan">✓</span>
              <span><strong>Multi-Density Plans:</strong> 2×2 (Plans A/B) or 1×1 (Plan C) downgrade ladder</span>
            </li>
            <li>
              <span className="feature-check cyan">✓</span>
              <span><strong>Hardware Friendly:</strong> Fullscreen mode with 100% display brightness</span>
            </li>
          </ul>

          <a href="#/send" className="btn-launch btn-launch-cyan">
            <span>Launch Transmitter</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>

        {/* Mode 2: Receiver */}
        <div className="mode-card card-receiver">
          <div className="card-ambient-glow green"></div>
          <div className="card-header">
            <div className="mode-badge green">OPTICAL RECEIVER</div>
            <span className="mode-device">Smartphone Web Camera</span>
          </div>

          <div className="card-icon-wrap green">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>

          <h2 className="mode-title">Receive Stream</h2>
          <p className="mode-desc">
            Points phone camera at the screen. Automatically segments quadrants, decodes QR symbols 
            with jsQR, and feeds incremental GF(2) Gaussian elimination until file is reconstructed.
          </p>

          <ul className="mode-features">
            <li>
              <span className="feature-check green">✓</span>
              <span><strong>Live HUD Telemetry:</strong> decodes/s, jsQR ms/cell latency, and rank/K progress</span>
            </li>
            <li>
              <span className="feature-check green">✓</span>
              <span><strong>Cover-and-Resume (T11):</strong> Zero state loss if optical path is temporarily obstructed</span>
            </li>
            <li>
              <span className="feature-check green">✓</span>
              <span><strong>Verified on CMF Phone 2 Pro:</strong> Rank 6/6 reconstructed in 7 seconds</span>
            </li>
          </ul>

          <a href="#/receive" className="btn-launch btn-launch-green">
            <span>Open Camera Scanner</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </section>

      {/* Mathematical Pipeline Visualization */}
      <section className="landing-pipeline">
        <div className="pipeline-header">
          <span className="pipeline-badge">END-TO-END DATA ARCHITECTURE</span>
          <h2 className="pipeline-title">Deterministic Photonic Pipeline</h2>
          <p className="pipeline-desc">From raw binary bytes to optical photon emissions and algebraic reconstruction.</p>
        </div>

        <div className="pipeline-steps">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-title">Deflate & Split</div>
            <p className="step-text">Source bytes are compressed with Deflate, hashed with IEEE CRC-32, and partitioned into K fixed-size blocks.</p>
            <div className="step-tag">pako 3.0.2</div>
          </div>

          <div className="step-connector">→</div>

          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-title">LT Fountain Code</div>
            <p className="step-text">Mulberry32 PRNG and Robust Soliton distribution select degree & random chunk subsets XORed into droplet payloads.</p>
            <div className="step-tag">GF(2) Arithmetic</div>
          </div>

          <div className="step-connector">→</div>

          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-title">Optical QR Grid</div>
            <p className="step-text">Packets rendered into N×N QR code modules at integer device pixels with pure white quiet zones on screen.</p>
            <div className="step-tag">qrcode 1.5.4</div>
          </div>

          <div className="step-connector">→</div>

          <div className="step-card">
            <div className="step-num">04</div>
            <div className="step-title">Optical Solver</div>
            <p className="step-text">Phone camera scans quadrants, runs jsQR, and solves linear equations incrementally until rank = K and CRC passes.</p>
            <div className="step-tag">jsqr 1.4.0</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-logo">LumenPipe</span>
          <span className="footer-note">Vibeathon — AI Powered Development · Galgotias University</span>
        </div>
        <div className="footer-right">
          <a href="#/send" className="footer-link">Sender</a>
          <a href="#/receive" className="footer-link">Receiver</a>
          <a href="https://github.com/ArushSengar/LuMenPipe" target="_blank" rel="noreferrer" className="footer-link">Source</a>
        </div>
      </footer>
    </div>
  );
}
