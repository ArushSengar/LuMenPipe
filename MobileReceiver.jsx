// src/components/MobileReceiver.jsx
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import pako from 'pako';

export default function MobileReceiver() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [metrics, setMetrics] = useState({ state: 'IDLE', caught: 0, total: 0, rate: 0 });
    const collectedSeeds = useRef(new Set());
    const payloadBuffer = useRef({});
    const lastTime = useRef(Date.now());

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", frameRate: { ideal: 30 } }
        }).then((stream) => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setMetrics(m => ({ ...m, state: 'CALIBRATING' }));
                requestAnimationFrame(processCameraTick);
            }
        });
    }, []);

    const processCameraTick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(processCameraTick);
            return;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
            try {
                const hexMatch = code.data.match(/.{1,2}/g);
                if (hexMatch) {
                    const bytes = new Uint8Array(hexMatch.map(byte => parseInt(byte, 16)));
                    const view = new DataView(bytes.buffer);
                    const seed = view.getUint32(0, false);
                    const totalChunks = view.getUint32(4, false);

                    if (!collectedSeeds.current.has(seed)) {
                        collectedSeeds.current.add(seed);
                        payloadBuffer.current[seed] = bytes.slice(8);

                        const now = Date.now();
                        const elapsed = (now - lastTime.current) / 1000;
                        const currentRate = elapsed > 0 ? Math.round(1 / elapsed) : 0;
                        lastTime.current = now;

                        setMetrics({
                            state: 'STREAMING',
                            caught: collectedSeeds.current.size,
                            total: totalChunks,
                            rate: currentRate
                        });

                        if (collectedSeeds.current.size >= totalChunks + 4) {
                            setMetrics(m => ({ ...m, state: 'COMPLETED' }));
                            triggerFileAssembly();
                            return;
                        }
                    }
                }
            } catch (e) {
                setMetrics(m => ({ ...m, state: 'RECOVERING' }));
            }
        }
        requestAnimationFrame(processCameraTick);
    };

    const triggerFileAssembly = () => {
        const sortedSeeds = Object.keys(payloadBuffer.current).map(Number).sort((a, b) => a - b);
        let totalLength = 0;
        sortedSeeds.forEach(seed => { totalLength += payloadBuffer.current[seed].length; });

        const flattened = new Uint8Array(totalLength);
        let offset = 0;
        sortedSeeds.forEach(seed => {
            flattened.set(payloadBuffer.current[seed], offset);
            offset += payloadBuffer.current[seed].length;
        });

        const decompressed = pako.inflate(flattened);
        const fileBlob = new Blob([decompressed.buffer], { type: "application/octet-stream" });
        const downloadUrl = URL.createObjectURL(fileBlob);

        const virtualLink = document.createElement('a');
        virtualLink.href = downloadUrl;
        virtualLink.download = "lumenpipe_received_data.bin";
        document.body.appendChild(virtualLink);
        virtualLink.click();
        document.body.removeChild(virtualLink);
    };

    return (
        <div className="control-panel" style={{ maxWidth: '450px', margin: '40px auto', textAlign: 'center' }}>
            <h3 style={{ color: '#00ff66' }}>LUMENPIPE // RECEIVER ENGINE</h3>
            <div className="telemetry-badge" style={{ marginBottom: '16px', display: 'inline-block' }}>HUD STATUS: {metrics.state}</div>
            <video ref={videoRef} style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-neon)' }} playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ marginTop: '20px', textAlign: 'left', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                <div>Droplets Collected: <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>{metrics.caught} / {metrics.total > 0 ? metrics.total + 4 : '--'}</span></div>
                <div>Channel Frequency: <span style={{ color: '#00ff66', fontWeight: 'bold' }}>{metrics.rate} frames/sec</span></div>
                <div className="progress-rail" style={{ marginTop: '10px' }}>
                    <div className="progress-bar-fill" style={{ width: `${metrics.total > 0 ? (metrics.caught / (metrics.total + 4)) * 100 : 0}%` }}></div>
                </div>
            </div>
        </div>
    );
}
