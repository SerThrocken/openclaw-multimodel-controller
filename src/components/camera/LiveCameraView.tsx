import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  X, Camera, CameraOff, ZoomIn, ZoomOut, RotateCcw,
  Crosshair, Download, Loader2, Lock, FlipHorizontal,
} from 'lucide-react';
import { useStore } from '../../store';
import { sendMessage } from '../../providers/api';
import { FREE_VISION_LIMIT, PATREON_URL } from '../../constants';

interface LiveCameraViewProps {
  onCapture: (imageUrl: string) => void;
  onClose: () => void;
  activeProviderId: string | null;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({ onCapture, onClose, activeProviderId }) => {
  const { settings, providers, canUseVision, recordVisionUsage } = useStore();
  const isPro = settings.isPro;

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const [cameraOn, setCameraOn]       = useState(false);
  const [facingMode, setFacingMode]   = useState<'environment' | 'user'>('environment');
  const [zoomLevel, setZoomLevel]     = useState(1);
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState('');
  const [ripple, setRipple]           = useState<{x:number;y:number} | null>(null);
  const [toast, setToast]             = useState('');
  const visionUsed = settings.visionUsageToday;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
      }
    } catch (e) {
      showToast('Camera access denied.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setZoomLevel(1);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const applyZoomCSS = (z: number) => {
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${z})`;
      videoRef.current.style.transformOrigin = 'center center';
    }
  };

  const handleZoom = (delta: number) => {
    if (!isPro) { showToast('🔒 Zoom is Pro only'); return; }
    const nz = Math.min(5, Math.max(1, zoomLevel + delta));
    setZoomLevel(nz);
    applyZoomCSS(nz);
  };

  const handleFacingToggle = () => {
    if (!isPro && facingMode === 'environment') { showToast('🔒 Front camera is Pro only'); return; }
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (cameraOn) { stopCamera(); setTimeout(() => startCamera(), 200); }
  };

  const captureFrameB64 = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    const nW = video.videoWidth, nH = video.videoHeight;
    canvas.width = nW; canvas.height = nH;
    const ctx = canvas.getContext('2d')!;
    if (zoomLevel > 1) {
      const cw = nW / zoomLevel, ch = nH / zoomLevel;
      ctx.drawImage(video, (nW - cw) / 2, (nH - ch) / 2, cw, ch, 0, 0, nW, nH);
    } else {
      ctx.drawImage(video, 0, 0);
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCapture = () => {
    const dataUrl = captureFrameB64();
    if (!dataUrl) { showToast('Enable camera first.'); return; }
    onCapture(dataUrl);
    showToast('📸 Sent to chat!');
  };

  const handleTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraOn) return;
    if (!canUseVision()) {
      showToast(`🔒 ${FREE_VISION_LIMIT}/day limit reached — unlock Pro for unlimited`);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    setRipple({ x: relX * 100, y: relY * 100 });
    setTimeout(() => setRipple(null), 600);

    const provider = providers.find(p => p.id === activeProviderId && p.enabled);
    if (!provider) { showToast('No active AI provider.'); return; }

    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const nW = video.videoWidth, nH = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = nW; canvas.height = nH;
    const ctx = canvas.getContext('2d')!;
    if (zoomLevel > 1) {
      const cw = nW / zoomLevel, ch = nH / zoomLevel;
      ctx.drawImage(video, (nW - cw) / 2, (nH - ch) / 2, cw, ch, 0, 0, nW, nH);
    } else {
      ctx.drawImage(video, 0, 0);
    }
    // Draw crosshair
    const cx = relX * nW, cy = relY * nH, r = Math.min(nW, nH) * 0.05;
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 1.5, cy); ctx.lineTo(cx + r * 1.5, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.5); ctx.lineTo(cx, cy + r * 1.5); ctx.stroke();

    const b64 = canvas.toDataURL('image/jpeg', 0.85);
    const xPct = Math.round(relX * 100), yPct = Math.round(relY * 100);
    const prompt = `I tapped at ${xPct}% from left, ${yPct}% from top (marked with a gold crosshair). Identify the specific item at that location and give 3–5 interesting facts. Be concise.`;

    setIdentifying(true);
    setIdentifyResult('');
    recordVisionUsage();

    try {
      const result = await sendMessage({
        provider,
        messages: [{ id: 'tap', role: 'user', content: prompt, timestamp: new Date().toISOString(), imageUrl: b64 }],
      });
      setIdentifyResult(result);
    } catch (err) {
      setIdentifyResult('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIdentifying(false);
    }
  };

  // Pinch-to-zoom
  const lastPinchDist = useRef<number | null>(null);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !isPro) return;
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    if (lastPinchDist.current !== null) {
      const delta = (d - lastPinchDist.current) / 80;
      const nz = Math.min(5, Math.max(1, zoomLevel + delta));
      setZoomLevel(nz);
      applyZoomCSS(nz);
    }
    lastPinchDist.current = d;
  };
  const handleTouchEnd = () => { lastPinchDist.current = null; };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
        <h2 className="text-white font-semibold text-sm">📷 Live Camera</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {!isPro && (
            <span className="bg-slate-800 px-2 py-1 rounded">
              🔍 {visionUsed}/{FREE_VISION_LIMIT} identifications today
            </span>
          )}
          {isPro && <span className="text-amber-400 font-semibold">🌟 Pro</span>}
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Camera viewport */}
      <div
        className="flex-1 relative overflow-hidden bg-black cursor-crosshair"
        onClick={handleTap}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transition: 'transform 0.1s' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            <CameraOff size={48} />
            <p className="text-sm">Tap the camera button below to start</p>
          </div>
        )}

        {/* Tap ripple */}
        {ripple && (
          <div
            className="absolute w-12 h-12 rounded-full border-2 border-amber-400 pointer-events-none"
            style={{
              left: `${ripple.x}%`, top: `${ripple.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'ripple-expand 0.55s ease-out forwards',
            }}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full whitespace-nowrap pointer-events-none">
            {toast}
          </div>
        )}

        {/* Identify loading */}
        {identifying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 text-white text-sm px-4 py-2 rounded-full">
            <Loader2 size={14} className="animate-spin" /> Identifying…
          </div>
        )}

        {/* Identify result */}
        {identifyResult && !identifying && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-amber-500/40 rounded-xl p-3 max-h-36 overflow-y-auto">
            <div className="text-amber-400 text-xs font-bold mb-1">🔍 Identified</div>
            <div className="text-slate-100 text-xs leading-relaxed">{identifyResult}</div>
            <button
              onClick={(e) => { e.stopPropagation(); setIdentifyResult(''); }}
              className="absolute top-2 right-2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Zoom indicator */}
        {zoomLevel > 1 && (
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {zoomLevel.toFixed(1)}×
          </div>
        )}

        {/* Tap hint */}
        {cameraOn && !identifyResult && !identifying && (
          <div className="absolute top-3 left-3 bg-black/50 text-slate-300 text-xs px-2 py-1 rounded flex items-center gap-1">
            <Crosshair size={11} /> Tap to identify
            {!isPro && <Lock size={10} className="ml-1 text-amber-400" />}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-700 px-4 py-3 space-y-3">
        {/* Zoom row — Pro only */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 shrink-0">
            {isPro ? 'Zoom' : <span className="flex items-center gap-1"><Lock size={10} /> Zoom</span>}
          </span>
          <button onClick={() => handleZoom(-0.5)} disabled={!isPro} className="p-1.5 bg-slate-800 rounded disabled:opacity-30 text-slate-300 hover:text-white">
            <ZoomOut size={14} />
          </button>
          <input
            type="range" min="1" max="5" step="0.1"
            value={zoomLevel}
            disabled={!isPro}
            onChange={(e) => { const nz = parseFloat(e.target.value); setZoomLevel(nz); applyZoomCSS(nz); }}
            className="flex-1 accent-blue-500 disabled:opacity-30"
          />
          <button onClick={() => handleZoom(0.5)} disabled={!isPro} className="p-1.5 bg-slate-800 rounded disabled:opacity-30 text-slate-300 hover:text-white">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => { setZoomLevel(1); applyZoomCSS(1); }} disabled={!isPro || zoomLevel === 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-30">
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-around">
          <button
            onClick={handleFacingToggle}
            className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <FlipHorizontal size={22} />
            <span>{facingMode === 'environment' ? 'Back' : 'Front'}{!isPro ? ' 🔒' : ''}</span>
          </button>

          {/* Main capture button */}
          <button
            onClick={(e) => { e.stopPropagation(); cameraOn ? handleCapture() : startCamera(); }}
            className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-colors ${
              cameraOn
                ? 'bg-white border-slate-300 hover:bg-slate-100'
                : 'bg-blue-600 border-blue-400 hover:bg-blue-700'
            }`}
          >
            {cameraOn
              ? <Camera size={28} className="text-slate-900" />
              : <Camera size={28} className="text-white" />
            }
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); if (cameraOn) stopCamera(); }}
            className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            {cameraOn ? <CameraOff size={22} /> : <Download size={22} />}
            <span>{cameraOn ? 'Stop' : 'Off'}</span>
          </button>
        </div>

        {/* Pro upsell */}
        {!isPro && (
          <p className="text-center text-xs text-slate-500">
            <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
              🌟 Unlock Pro ($5+/mo)
            </a>{' '}
            for unlimited identifications, front camera &amp; zoom
          </p>
        )}
      </div>

      <style>{`
        @keyframes ripple-expand {
          from { transform: translate(-50%,-50%) scale(0); opacity:1; }
          to   { transform: translate(-50%,-50%) scale(2); opacity:0; }
        }
      `}</style>
    </div>
  );
};
