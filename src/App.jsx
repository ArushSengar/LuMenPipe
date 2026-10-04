import React, { useState } from 'react';
import SenderGrid from './components/SenderGrid.jsx';
import MobileReceiver from './components/MobileReceiver.jsx';
import { Radio, Scan, Cpu, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('sender'); // 'sender' | 'receiver' | 'specs'

  return (
    <div className="lumenpipe-app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'var(--panel-dark)',
        border: '1px solid var(--border-neon)',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0, 240, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0f1d'
          }}>
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '2px', color: 'var(--text-main)' }}>
              LUMEN<span style={{ color: 'var(--neon-cyan)' }}>PIPE</span>
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Zero-RF // Optical Air-Gapped Data Broadcast
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => setMode('sender')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: mode === 'sender' ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'sender' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'sender' ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <Radio size={16} /> TRANSMITTER (BROADCAST)
          </button>

          <button
            onClick={() => setMode('receiver')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: mode === 'receiver' ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'receiver' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'receiver' ? 'var(--neon-green)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <Scan size={16} /> RECEIVER (CAMERA)
          </button>

          <button
            onClick={() => setMode('specs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: mode === 'specs' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
              background: mode === 'specs' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'specs' ? '#c084fc' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <Cpu size={16} /> SPECS & ARCHITECTURE
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {mode === 'sender' && <SenderGrid />}
        {mode === 'receiver' && <MobileReceiver />}
        {mode === 'specs' && (
          <div className="control-panel" style={{ maxWidth: '900px', margin: '0 auto', lineHeight: '1.6' }}>
            <h2 style={{ color: 'var(--neon-cyan)', borderBottom: '1px solid var(--border-neon)', paddingBottom: '10px' }}>
              MATHEMATICAL FOUNTAIN CODE ARCHITECTURE
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              LuMenPipe bypasses traditional RF signals (Wi-Fi, Bluetooth, Cellular) entirely. By deploying Luby Transform Fountain erasure codes over a high-frequency 2x2 optical array, arbitrary files can be received simultaneously by multiple air-gapped endpoints without ACK/NACK validation loops.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-neon)' }}>
                <h4 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} /> Zero-RF Security
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Immune to RF jamming, packet sniffing, and network interception. Data only flows where photons can travel.
                </p>
              </div>

              <div style={{ background: 'rgba(0, 255, 102, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,255,102,0.2)' }}>
                <h4 style={{ color: 'var(--neon-green)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} /> Broadcaster Scalability
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Transfer throughput never degrades with multiple devices. 100 devices consume the screen stream simultaneously at the same speed.
                </p>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <h4 style={{ color: '#c084fc', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} /> Hardware Calibration
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Calibrated for mid-tier lenses (OnePlus Nord CE 2 Lite 2x2 @ 20 FPS) and high-density receivers (CMF Phone 2 Pro up to 1.2 MB/s).
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer style={{
        marginTop: '32px',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <span>STATUS: <span style={{ color: 'var(--neon-green)' }}>ONLINE</span></span>
        <span>ENGINE: VITE 6 + REACT 18 + PAKO + JSQR</span>
        <span>AIR-GAP SECURED</span>
      </footer>
    </div>
  );
}
