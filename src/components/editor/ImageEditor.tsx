import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Download, Sliders, Pencil, Type, Eraser, Loader2, Wand2,
} from 'lucide-react';
import { useStore } from '../../store';
import { sendMessage } from '../../providers/api';
import { PATREON_URL } from '../../constants';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedUrl: string) => void;
  onClose: () => void;
  activeProviderId?: string | null;
}

type FilterId = 'normal'|'grayscale'|'sepia'|'invert'|'warm'|'cool'|'vivid';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'normal',    label: 'Normal'    },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'sepia',     label: 'Sepia'     },
  { id: 'invert',    label: 'Invert'    },
  { id: 'warm',      label: 'Warm'      },
  { id: 'cool',      label: 'Cool'      },
  { id: 'vivid',     label: 'Vivid'     },
];

function applyFilter(ctx: CanvasRenderingContext2D, w: number, h: number, filter: FilterId) {
  if (filter === 'normal') return;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    if (filter === 'grayscale') { const v = r*0.299+g*0.587+b*0.114; r=g=b=v; }
    else if (filter === 'sepia') {
      const origR = r, origG = g, origB = b;
      r=Math.min(255,origR*0.393+origG*0.769+origB*0.189);
      g=Math.min(255,origR*0.349+origG*0.686+origB*0.168);
      b=Math.min(255,origR*0.272+origG*0.534+origB*0.131);
    }
    else if (filter === 'invert') { r=255-r; g=255-g; b=255-b; }
    else if (filter === 'warm') { r=Math.min(255,r+20); b=Math.max(0,b-20); }
    else if (filter === 'cool') { r=Math.max(0,r-20); b=Math.min(255,b+20); }
    else if (filter === 'vivid') { r=Math.min(255,r*1.2); g=Math.min(255,g*1.2); b=Math.min(255,b*1.2); }
    d[i]=r; d[i+1]=g; d[i+2]=b;
  }
  ctx.putImageData(imgData, 0, 0);
}

function applyAdjustments(ctx: CanvasRenderingContext2D, w: number, h: number,
  brightness: number, contrast: number, saturation: number) {
  if (brightness===100 && contrast===100 && saturation===100) return;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const br = brightness / 100;
  const co = contrast / 100;
  const sa = saturation / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
    r*=br; g*=br; b*=br;
    r=(r-0.5)*co+0.5; g=(g-0.5)*co+0.5; b=(b-0.5)*co+0.5;
    const gray = r*0.299+g*0.587+b*0.114;
    r=gray+(r-gray)*sa; g=gray+(g-gray)*sa; b=gray+(b-gray)*sa;
    d[i]=Math.min(255,Math.max(0,r*255));
    d[i+1]=Math.min(255,Math.max(0,g*255));
    d[i+2]=Math.min(255,Math.max(0,b*255));
  }
  ctx.putImageData(imgData, 0, 0);
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onClose, activeProviderId }) => {
  const { settings, providers } = useStore();
  const isPro = settings.isPro;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [srcImg, setSrcImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [filter, setFilter] = useState<FilterId>('normal');
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#f59e0b');
  const [drawSize, setDrawSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{x:number;y:number}|null>(null);
  const [textValue, setTextValue] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [activeTab, setActiveTab] = useState<'adjust'|'filter'|'draw'|'ai'>('adjust');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setSrcImg(img);
    img.src = imageUrl;
  }, [imageUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = srcImg;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;

    const isRotated90 = rotation % 180 !== 0;
    const w = isRotated90 ? img.height : img.width;
    const h = isRotated90 ? img.width : img.height;
    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(img, -img.width/2, -img.height/2);
    ctx.restore();

    applyAdjustments(ctx, w, h, brightness, contrast, saturation);
    applyFilter(ctx, w, h, filter);
  }, [srcImg, rotation, flipH, flipV, brightness, contrast, saturation, filter]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/jpeg', 0.9));
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.9);
    a.download = `openclaw-edit-${Date.now()}.jpg`;
    a.click();
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode) return;
    setIsDrawing(true);
    setLastPos(getCanvasPos(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode || !isDrawing || !lastPos) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getCanvasPos(e);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  };

  const handleMouseUp = () => { setIsDrawing(false); setLastPos(null); };

  const handleAIEdit = async () => {
    if (!isPro) return;
    const provider = providers.find(p => p.id === activeProviderId && p.enabled);
    if (!provider) { setAiResult('No active AI provider.'); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgB64 = canvas.toDataURL('image/jpeg', 0.7);
    setAiLoading(true);
    setAiResult('');
    try {
      const result = await sendMessage({
        provider,
        messages: [{
          id: 'ai-edit', role: 'user', timestamp: new Date().toISOString(),
          content: `You are an image editing assistant. The user wants to: "${aiPrompt}". Look at this image and suggest SPECIFIC editing adjustments as numbers I can apply (brightness %, contrast %, saturation %, which filter from: normal/grayscale/sepia/invert/warm/cool/vivid, and any other specific advice). Format your response as a short bullet list.`,
          imageUrl: imgB64,
        }],
      });
      setAiResult(result);
    } catch (err) {
      setAiResult('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
        <h2 className="text-white font-semibold text-sm">🖼 Image Editor</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg">
            <Download size={13} /> Save to device
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg">
            ✓ Use in Chat
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black p-4">
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-full object-contain ${drawMode ? 'cursor-crosshair' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Controls panel */}
        <div className="w-64 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Transform */}
          <div className="px-3 py-2 border-b border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Transform</p>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { icon: <RotateCcw size={14}/>, label:'↺', action: () => setRotation(r=>(r-90+360)%360) },
                { icon: <RotateCw size={14}/>,  label:'↻', action: () => setRotation(r=>(r+90)%360) },
                { icon: <FlipHorizontal size={14}/>, label:'⇔', action: () => setFlipH(v=>!v) },
                { icon: <FlipVertical size={14}/>, label:'⇕', action: () => setFlipV(v=>!v) },
                { icon: <X size={14}/>, label:'Reset', action: () => { setRotation(0);setFlipH(false);setFlipV(false);setBrightness(100);setContrast(100);setSaturation(100);setFilter('normal'); } },
              ].map((btn,i) => (
                <button key={i} onClick={btn.action} title={btn.label}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded">
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-slate-700 shrink-0">
            {(['adjust','filter','draw','ai'] as const).map((id) => {
              const label = id === 'adjust' ? 'Adjust' : id === 'filter' ? 'Filters' : id === 'draw' ? 'Draw' : 'AI ✦';
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab===id ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-white'
                  } ${id==='ai' && !isPro ? 'text-amber-500/60' : ''}`}>
                  {id==='ai' && !isPro ? '🔒 AI' : label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {activeTab === 'adjust' && (
              <>
                {[
                  { label:'Brightness', value:brightness, setter:setBrightness, min:10, max:200 },
                  { label:'Contrast',   value:contrast,   setter:setContrast,   min:10, max:200 },
                  { label:'Saturation', value:saturation, setter:setSaturation, min:0,  max:200 },
                ].map(({label,value,setter,min,max}) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{label}</span><span>{value}%</span>
                    </div>
                    <input type="range" min={min} max={max} value={value}
                      onChange={e => setter(Number(e.target.value))}
                      className="w-full accent-blue-500" />
                  </div>
                ))}
              </>
            )}

            {activeTab === 'filter' && (
              <div className="grid grid-cols-2 gap-2">
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`py-2 text-xs rounded-lg border transition-colors ${
                      filter===f.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'draw' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setDrawMode(v=>!v)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border transition-colors ${
                      drawMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    <Pencil size={12}/> Draw
                  </button>
                  <button onClick={() => { setDrawColor('#1e293b'); setDrawMode(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white">
                    <Eraser size={12}/> Erase
                  </button>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Color</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {['#f59e0b','#ef4444','#3b82f6','#22c55e','#ffffff','#000000'].map(c => (
                      <button key={c} onClick={() => { setDrawColor(c); setDrawMode(true); }}
                        className={`w-6 h-6 rounded-full border-2 ${drawColor===c ? 'border-white' : 'border-transparent'}`}
                        style={{backgroundColor:c}} />
                    ))}
                    <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer" title="Custom color" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Brush size</span><span>{drawSize}px</span></div>
                  <input type="range" min="1" max="30" value={drawSize} onChange={e => setDrawSize(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Text overlay</p>
                  <div className="flex gap-1.5">
                    <input type="text" value={textValue} onChange={e=>setTextValue(e.target.value)}
                      placeholder="Enter text…"
                      className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500" />
                    <button onClick={() => {
                      const canvas = canvasRef.current; if(!canvas||!textValue) return;
                      const ctx = canvas.getContext('2d')!;
                      ctx.font = `${Math.round(canvas.width*0.04)}px sans-serif`;
                      ctx.fillStyle = drawColor;
                      ctx.strokeStyle = '#000';
                      ctx.lineWidth = 2;
                      ctx.strokeText(textValue, 20, canvas.height*0.9);
                      ctx.fillText(textValue, 20, canvas.height*0.9);
                    }} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                      <Type size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              isPro ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Describe how you want to edit this image and the AI will suggest specific adjustments.</p>
                  <textarea
                    value={aiPrompt}
                    onChange={e=>setAiPrompt(e.target.value)}
                    placeholder="e.g. Make it warmer and increase contrast, remove noise…"
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button onClick={handleAIEdit} disabled={!aiPrompt.trim()||aiLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs rounded-lg">
                    {aiLoading ? <><Loader2 size={12} className="animate-spin"/>Analyzing…</> : <><Wand2 size={12}/>Suggest Edits</>}
                  </button>
                  {aiResult && (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {aiResult}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <Sliders size={32} className="mx-auto text-amber-400/50" />
                  <p className="text-sm font-semibold text-amber-300">AI Editing is Pro Only</p>
                  <p className="text-xs text-slate-400">Describe what to change and the AI suggests precise adjustments.</p>
                  <a href={PATREON_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg">
                    ❤ Unlock Pro ($5+/mo)
                  </a>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
