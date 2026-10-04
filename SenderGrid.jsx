// src/components/SenderGrid.jsx
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import pako from 'pako';

class FountainEncoder {
    constructor(fileBuffer, chunkSize = 1500) {
        const compressedData = pako.deflate(new Uint8Array(fileBuffer));
        this.data = compressedData;
        this.chunkSize = chunkSize;
        this.totalChunks = Math.ceil(compressedData.length / chunkSize);
        this.sourceChunks = [];

        for (let i = 0; i < this.totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, compressedData.length);
            const chunk = compressedData.slice(start, end);
            if (chunk.length < chunkSize) {
                const padded = new Uint8Array(chunkSize);
                padded.set(chunk);
                this.sourceChunks.push(padded);
            } else {
                this.sourceChunks.push(chunk);
            }
        }
        this.generatedCount = 0;
    }

    generateDroplet() {
        this.generatedCount++;
        const seed = this.generatedCount;
        const degree = (seed * 1103515245 + 12345) % 2147483648 / 2147483648 < 0.5 ? 1 : 2;
        const indices = new Set();
        let currentSeed = seed;
        while (indices.size < degree) {
            currentSeed = (currentSeed * 1103515245 + 12345) % 2147483648;
            indices.add(currentSeed % this.totalChunks);
        }

        const dropletPayload = new Uint8Array(this.chunkSize);
        for (const index of indices) {
            for (let i = 0; i < this.chunkSize; i++) {
                dropletPayload[i] ^= this.sourceChunks[index][i];
            }
        }

        const headerBuffer = new ArrayBuffer(8);
        const view = new DataView(headerBuffer);
        view.setUint32(0, seed, false);
        view.setUint32(4, this.totalChunks, false);

        const finalDroplet = new Uint8Array(8 + this.chunkSize);
        finalDroplet.set(new Uint8Array(headerBuffer), 0);
        finalDroplet.set(dropletPayload, 8);

        return Array.from(finalDroplet).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export default function SenderGrid() {
    const [encoder, setEncoder] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [fps, setFps] = useState(20);
    const canvasRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    const loopRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setEncoder(new FountainEncoder(event.target.result, 1200));
        };
        reader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        if (!isStreaming || !encoder) return;
        const renderFrameLoop = async () => {
            for (let i = 0; i < 4; i++) {
                const payloadString = encoder.generateDroplet();
                const canvas = canvasRefs[i].current;
                if (canvas) {
                    await QRCode.toCanvas(canvas, payloadString, {
                        width: 200,
                        margin: 1,
                        errorCorrectionLevel: 'L'
                    });
                }
            }
            loopRef.current = setTimeout(renderFrameLoop, 1000 / fps);
        };
        renderFrameLoop();
        return () => clearTimeout(loopRef.current);
    }, [isStreaming, encoder, fps]);

    return (
        <div className="stream-container">
            <div className="control-panel">
                <h2 style={{ color: '#00f0ff', margin: '0 0 16px 0' }}>LUMENPIPE // OPTICAL TRANSMITTER ARRAY</h2>
                <input type="file" onChange={handleFileChange} className="telemetry-badge" style={{ background: 'transparent', cursor: 'pointer' }} />
                {encoder && (
                    <div style={{ marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button onClick={() => setIsStreaming(!isStreaming)} style={{ background: '#00ff66', color: '#0a0f1d', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                            {isStreaming ? "HALT BROADCAST" : "ENGAGE TRANSMISSION"}
                        </button>
                        <label style={{ color: '#64748b' }}>FPS Sync Control: </label>
                        <input type="range" min="10" max="45" value={fps} onChange={(e) => setFps(Number(e.target.value))} />
                        <span className="telemetry-badge">{fps} FPS</span>
                    </div>
                )}
            </div>
            <div className="matrix-display-grid">
                <div style={{ position: 'relative' }}><canvas ref={canvasRefs[0]} /><div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '4px solid #00f0ff', borderLeft: '4px solid #00f0ff' }}></div></div>
                <div style={{ position: 'relative' }}><canvas ref={canvasRefs[1]} /><div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '4px solid #00f0ff', borderRight: '4px solid #00f0ff' }}></div></div>
                <div style={{ position: 'relative' }}><canvas ref={canvasRefs[2]} /><div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '4px solid #00f0ff', borderLeft: '4px solid #00f0ff' }}></div></div>
                <div style={{ position: 'relative' }}><canvas ref={canvasRefs[3]} /><div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '4px solid #00f0ff', borderRight: '4px solid #00f0ff' }}></div></div>
            </div>
        </div>
    );
}
