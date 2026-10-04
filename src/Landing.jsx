import React from 'react';

export default function Landing() {
  return (
    <div className="landing">
      <h1 className="landing-title">LumenPipe</h1>
      <p className="landing-desc">
        One-way optical file transfer via QR codes.
        No network is used between devices; the page itself must be loaded once.
      </p>
      <div className="landing-buttons">
        <a href="#/send" className="btn btn-primary">Send</a>
        <a href="#/receive" className="btn btn-secondary">Receive</a>
      </div>
    </div>
  );
}
