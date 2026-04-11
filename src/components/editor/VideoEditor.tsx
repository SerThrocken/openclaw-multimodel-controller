import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Play, Pause, Scissors, Camera, Loader2, Wand2 } from 'lucide-react';
import { useStore } from '../../store';
import { sendMessage } from '../../providers/api';
import { PATREON_URL } from '../../constants';
import { ImageEditor } from './ImageEditor';

interface VideoEditorProps {
  videoUrl: string;
  onClose: () => void;
  onExportFrame: (imageUrl: string) => void;
  activeProviderId?: string | null;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoUrl, onClose, onExportFrame, activeProviderId }) => {
  const { settings, providers } = useStore();
  const isPro = settings.isPro;

  const videoRef   = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]       = useState(false);
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart]   = useState(0);
  const [trimEnd, setTrimEnd]       = useState(0);
  const [capturedFrame, setCapturedFrame] = useState<string|null>(null);
  const [editingFrame, setEditingFrame]   = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResult, setAiResult]     = useState('');

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => { setDuration(v.duration); setTrimEnd(v.duration); };
    const onTime = () => setCurrentTime(v.currentTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', () => setPlaying(false));
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current; if(!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.currentTime = Math.max(v.currentTime, trimStart); v.play(); setPlaying(true); }
  };

  const captureFrame = () => {
    const v = videoRef.current; if(!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setCapturedFrame(c.toDataURL('image/jpeg', 0.9));
  };

  const handleAIDescribe = async () => {
    if (!isPro) return;
    const provider = providers.find(p => p.id === activeProviderId && p.enabled);
    if (!provider) { setAiResult('No active AI provider.'); return; }
    captureFrame();
    const v = videoRef.current; if(!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const imgB64 = c.toDataURL('image/jpeg', 0.7);
    setAiLoading(true); setAiResult('');
    try {
      const result = await sendMessage({
        provider,
        messages: [{ id:'vid-ai', role:'user', timestamp:new Date().toISOString(),
          content: `Describe this video frame in detail. Include: the scene, subjects, activities, lighting, and suggest any editing improvements.`,
          imageUrl: imgB64 }],
      });
      setAiResult(result);
    } catch(e) { setAiResult('Error: '+(e instanceof Error ? e.message : String(e))); }
    finally { setAiLoading(false); }
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  if (editingFrame && capturedFrame) {
    return <ImageEditor imageUrl={capturedFrame} onSave={(url) => { setEditingFrame(false); onExportFrame(url); }} onClose={() => setEditingFrame(false)} activeProviderId={activeProviderId} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
        <h2 className="text-white font-semibold text-sm">🎬 Video Editor</h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={16}/></button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        {/* Video */}
        <div className="flex-1 flex items-center justify-center bg-black rounded-xl overflow-hidden min-h-0">
          <video ref={videoRef} src={videoUrl} className="max-w-full max-h-full" />
        </div>

        {/* Timeline */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 shrink-0">
          {/* Playback */}
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              {playing ? <Pause size={16}/> : <Play size={16}/>}
            </button>
            <span className="text-xs text-slate-400 font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
            <input type="range" min={0} max={duration||1} step={0.1} value={currentTime}
              onChange={e => { const v=videoRef.current; if(v){v.currentTime=Number(e.target.value);setCurrentTime(Number(e.target.value));} }}
              className="flex-1 accent-blue-500" />
          </div>

          {/* Trim */}
          <div>
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Scissors size={11}/> Trim</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-12">Start</span>
                <input type="range" min={0} max={duration||1} step={0.1} value={trimStart}
                  onChange={e=>setTrimStart(Math.min(Number(e.target.value),trimEnd-0.1))}
                  className="flex-1 accent-green-500"/>
                <span className="w-10 text-right font-mono">{fmt(trimStart)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-12">End</span>
                <input type="range" min={0} max={duration||1} step={0.1} value={trimEnd}
                  onChange={e=>setTrimEnd(Math.max(Number(e.target.value),trimStart+0.1))}
                  className="flex-1 accent-red-500"/>
                <span className="w-10 text-right font-mono">{fmt(trimEnd)}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Trim selects {fmt(trimEnd-trimStart)} of footage. Full video export requires a server-side tool; frame editing is available below.</p>
          </div>

          {/* Frame capture */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={captureFrame}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg">
              <Camera size={13}/> Capture Frame
            </button>
            {capturedFrame && (
              <>
                <button onClick={() => setEditingFrame(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg">
                  🖼 Edit Frame
                </button>
                <button onClick={() => onExportFrame(capturedFrame)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg">
                  <Download size={13}/> Send to Chat
                </button>
              </>
            )}
            {capturedFrame && (
              <img src={capturedFrame} alt="Captured frame"
                className="h-12 w-auto rounded border border-slate-600 object-cover" />
            )}
          </div>

          {/* AI Scene Describe — Pro */}
          <div className="border-t border-slate-700 pt-3">
            {isPro ? (
              <div className="space-y-2">
                <button onClick={handleAIDescribe} disabled={aiLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs rounded-lg">
                  {aiLoading ? <><Loader2 size={12} className="animate-spin"/>Analyzing frame…</> : <><Wand2 size={12}/>AI Describe Current Frame</>}
                </button>
                {aiResult && (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed">
                    {aiResult}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                🔒 AI scene analysis is Pro only.{' '}
                <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  Unlock Pro ($5+/mo) →
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
