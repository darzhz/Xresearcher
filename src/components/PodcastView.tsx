import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  X, 
  Mic2, 
  Cpu, 
  Zap,
  Loader2,
  Volume2,
  Headphones,
  List,
  ChevronDown,
  Info,
  Settings2
} from 'lucide-react'
import { PaperData } from '../types'

interface PodcastViewProps {
  paper: PaperData
  script: string
  onClose: () => void
  isGenerating?: boolean
}

interface Segment {
  text: string
  buf: AudioBuffer | null
  status: 'pending' | 'loading' | 'ready' | 'playing' | 'done' | 'error'
}

const VOICES = [
  { id: 'af_heart', name: 'af_heart — Warm ♀' },
  { id: 'af_bella', name: 'af_bella — Expressive ♀' },
  { id: 'af_nicole', name: 'af_nicole — Soft ♀' },
  { id: 'af_sarah', name: 'af_sarah — Clear ♀' },
  { id: 'am_adam', name: 'am_adam — Deep ♂' },
  { id: 'am_michael', name: 'am_michael — Neutral ♂' },
  { id: 'bf_emma', name: 'bf_emma — British ♀' },
  { id: 'bm_george', name: 'bm_george — British ♂' },
]

export function PodcastView({ paper, script, onClose, isGenerating }: PodcastViewProps) {
  // TTS Worker State
  const workerRef = useRef<Worker | null>(null)
  const [modelStatus, setModelStatus] = useState('Initializing...')
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm')
  
  // Audio State
  const [segments, setSegments] = useState<Segment[]>([])
  const [curSegIdx, setCurSegIdx] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voice, setVoice] = useState('af_heart')
  const [showScript, setShowScript] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isAudioGenerating, setIsAudioGenerating] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const segmentsRef = useRef<Segment[]>([])
  const curSegIdxRef = useRef(-1)
  const playingRef = useRef(false)
  const segStartedAtRef = useRef(0)
  const segOffsetRef = useRef(0)
  const elapsedBeforeCurRef = useRef(0)
  
  // Initialize Worker and AudioContext
  useEffect(() => {
    const init = async () => {
      // GPU Detection
      const gpuAvailable = !!(navigator as any).gpu
      let selectedDevice: 'webgpu' | 'wasm' = 'wasm'
      if (gpuAvailable) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter()
          if (adapter) selectedDevice = 'webgpu'
        } catch (e) { console.error('GPU detection failed', e) }
      }
      setDevice(selectedDevice)
      
      // Initialize Worker
      const worker = new Worker(new URL('../workers/tts.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      
      worker.onmessage = async (e: MessageEvent<any>) => { // Use 'any' for now, will refine with MessageData later
        const { type, message, audio, sampling_rate, error } = e.data
        
        if (type === 'status') {
          setModelStatus(message)
        } else if (type === 'init-complete') {
          setModelStatus('Model Ready')
          setIsWorkerReady(true)
        } else if (type === 'result') {
          handleWorkerResult(audio, sampling_rate)
        } else if (type === 'error') {
          console.error('TTS Worker Error:', error)
          setModelStatus('Error: ' + error)
          setIsAudioGenerating(false)
        } else if (type === 'disposed') {
          // This message is handled during worker cleanup, no action here
        }
      }
      
      const dtype = selectedDevice === 'webgpu' ? 'fp32' : 'q8'
      worker.postMessage({ type: 'init', device: selectedDevice, dtype })
      
      // Initialize AudioContext
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      analyserRef.current.connect(audioCtxRef.current.destination)
    }
    
    init()
    
    return () => {
      stopAll()
      if (workerRef.current) {
        const currentWorker = workerRef.current;
        const originalOnMessage = currentWorker.onmessage;
        currentWorker.onmessage = null; // Temporarily disable to avoid unexpected messages

        const disposePromise = new Promise<void>((resolve) => {
          const onDisposeMessage = (e: MessageEvent) => {
            if (e.data.type === 'disposed') {
              currentWorker.removeEventListener('message', onDisposeMessage);
              resolve();
            }
          };
          currentWorker.addEventListener('message', onDisposeMessage);
          currentWorker.postMessage({ type: 'dispose' });
        });

        // Use an immediately invoked async function for cleanup
        (async () => {
          await disposePromise;
          currentWorker.terminate();
          // Restore original onmessage or set to null if no longer needed
          // For cleanup, it's fine to keep it null as worker is terminated
        })();
      }
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  // Process script into segments only when generation is done or updated
  useEffect(() => {
    if (!script) return
    
    const sentences = script.match(/[^.!?\n]+[.!?\n]*/g) || []
    const newSegments: Segment[] = sentences
      .map(s => s.trim())
      .filter(s => s.length > 2)
      .map(text => ({
        text,
        buf: null,
        status: 'pending'
      }))
    
    setSegments(newSegments)
    segmentsRef.current = newSegments
    setIsAudioReady(false)
    setTotalDuration(0)
  }, [script])

  // Auto-start synthesis when script and worker are ready
  useEffect(() => {
    if (isWorkerReady && script && segments.length > 0 && !isAudioGenerating && !isAudioReady && !isGenerating) {
      startSynthesis()
    }
  }, [isWorkerReady, script, segments.length, isAudioGenerating, isAudioReady, isGenerating])

  // Autoplay when all segments are ready
  useEffect(() => {
    if (isAudioReady && !isPlaying && curSegIdx === -1 && segments.length > 0) {
      playSegment(0)
    }
  }, [isAudioReady])

  const handleWorkerResult = (audioData: Float32Array, samplingRate: number) => {
    if (!audioCtxRef.current) return
    
    const idx = segmentsRef.current.findIndex(s => s.status === 'loading')
    if (idx === -1) return

    const buf = audioCtxRef.current.createBuffer(1, audioData.length, samplingRate)
    buf.getChannelData(0).set(audioData)
    
    const nextSegments = [...segmentsRef.current]
    nextSegments[idx].buf = buf
    nextSegments[idx].status = 'ready'
    
    setSegments(nextSegments)
    segmentsRef.current = nextSegments
    
    // Recalculate total duration
    const newTotalDur = nextSegments.reduce((acc, s) => acc + (s.buf?.duration || 0), 0)
    setTotalDuration(newTotalDur)

    // Check if more segments need synthesis
    const nextPending = nextSegments.findIndex(s => s.status === 'pending')
    if (nextPending !== -1) {
      synthesizeSegment(nextPending)
    } else {
      setIsAudioGenerating(false)
      setIsAudioReady(true)
    }
  }

  const startSynthesis = () => {
    if (!isWorkerReady || isAudioGenerating || isGenerating) return
    setIsAudioGenerating(true)
    setIsAudioReady(false)
    
    // Reset any existing buffers/status
    const resetSegments = segmentsRef.current.map(s => ({ ...s, buf: null, status: 'pending' as const }))
    setSegments(resetSegments)
    segmentsRef.current = resetSegments
    
    synthesizeSegment(0)
  }

  const synthesizeSegment = (idx: number) => {
    if (!workerRef.current || idx >= segmentsRef.current.length) {
      setIsAudioGenerating(false)
      setIsAudioReady(true)
      return
    }

    const nextSegments = [...segmentsRef.current]
    nextSegments[idx].status = 'loading'
    setSegments(nextSegments)
    segmentsRef.current = nextSegments

    workerRef.current.postMessage({
      type: 'generate',
      text: nextSegments[idx].text,
      voice,
      speed: 1.0 // Fixed speed
    })
  }

  const playSegment = (idx: number, offset = 0) => {
    if (idx < 0 || idx >= segmentsRef.current.length) {
      onPlaybackEnded()
      return
    }

    const seg = segmentsRef.current[idx]
    if (!seg?.buf) return

    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()

    const src = audioCtxRef.current!.createBufferSource()
    src.buffer = seg.buf
    src.connect(analyserRef.current!)
    srcNodeRef.current = src

    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, status: 'playing' } : s))
    setCurSegIdx(idx)
    curSegIdxRef.current = idx

    src.onended = () => {
      if (!playingRef.current) return
      setSegments(prev => prev.map((s, i) => i === idx ? { ...s, status: 'done' } : s))
      elapsedBeforeCurRef.current += seg.buf!.duration
      
      const nextIdx = idx + 1
      playSegment(nextIdx)
    }

    src.start(0, offset)
    segStartedAtRef.current = audioCtxRef.current!.currentTime - offset
    setIsPlaying(true)
    playingRef.current = true
    
    if (rafRef.current === null) animate()
  }

  const pausePlayback = () => {
    if (!isPlaying || !srcNodeRef.current) return
    
    const elapsed = audioCtxRef.current!.currentTime - segStartedAtRef.current
    srcNodeRef.current.onended = null
    try { srcNodeRef.current.stop() } catch (e) {}
    srcNodeRef.current = null
    
    setIsPlaying(false)
    playingRef.current = false
    segOffsetRef.current = elapsed
    
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const stopAll = () => {
    if (srcNodeRef.current) {
      srcNodeRef.current.onended = null
      try { srcNodeRef.current.stop() } catch (e) {}
      srcNodeRef.current = null
    }
    
    setIsPlaying(false)
    playingRef.current = false
    setCurSegIdx(-1)
    curSegIdxRef.current = -1
    elapsedBeforeCurRef.current = 0
    segOffsetRef.current = 0
    setCurrentTime(0)
    
    setSegments(prev => prev.map(s => s.buf ? { ...s, status: 'ready' } : s))

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const onPlaybackEnded = () => {
    setIsPlaying(false)
    playingRef.current = false
    setCurSegIdx(-1)
    curSegIdxRef.current = -1
    setCurrentTime(totalDuration)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const animate = () => {
    rafRef.current = requestAnimationFrame(animate)

    // Update progress
    const ct = playingRef.current 
      ? elapsedBeforeCurRef.current + (audioCtxRef.current!.currentTime - segStartedAtRef.current)
      : elapsedBeforeCurRef.current + segOffsetRef.current
    setCurrentTime(Math.min(ct, totalDuration))
  }

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] newsprint-texture" />

      {/* Modern Header */}
      <header className="p-4 flex justify-between items-center bg-paper/80 backdrop-blur-sm relative z-20">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-ink hover:text-paper transition-colors rounded-full border-2 border-ink"
        >
          <ChevronDown size={24} />
        </button>
        
        <div className="text-center flex-1 mx-4 overflow-hidden">
          <p className="font-mono text-[9px] uppercase font-black tracking-[0.2em] text-ink/40 mb-0.5">Now Playing</p>
          <h2 className="font-display font-black uppercase text-sm tracking-tight truncate px-4">{paper.title}</h2>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 transition-colors rounded-full border-2 border-ink ${showSettings ? 'bg-ink text-paper' : 'hover:bg-ink hover:text-paper'}`}
        >
          <Settings2 size={20} />
        </button>
      </header>

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Artwork / Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
          <div className="w-full max-w-[320px] aspect-square relative group">
            <div className="absolute inset-0 bg-ink translate-x-3 translate-y-3" />
            <div className="absolute inset-0 border-4 border-ink bg-paper p-8 flex flex-col items-center justify-center overflow-hidden transition-transform active:scale-95">
               {isPlaying ? (
                  <div className="flex items-end justify-center gap-2 h-40 w-full">
                     {[...Array(12)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-2.5 bg-ink animate-waveform" 
                          style={{ 
                             animationDelay: `${i * 0.15}s`,
                             height: '15%' 
                          }} 
                        />
                     ))}
                  </div>
               ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 border-4 border-ink flex items-center justify-center mx-auto bg-editorial/5">
                      {isAudioGenerating || isGenerating ? (
                        <Loader2 size={40} className="animate-spin text-editorial" />
                      ) : (
                        <Mic2 size={40} className="text-ink/20" />
                      )}
                    </div>
                    <div>
                      <p className="font-display font-black text-xs uppercase tracking-widest">
                        {isAudioGenerating ? 'Synthesizing...' : isGenerating ? 'Writing Script...' : 'Ready to Play'}
                      </p>
                    </div>
                  </div>
               )}
            </div>
          </div>

          <div className="w-full max-w-[320px] text-left space-y-1">
            <h3 className="font-display font-black text-2xl leading-tight uppercase line-clamp-2">{paper.title}</h3>
            <p className="font-mono text-[10px] uppercase font-bold text-ink/60 tracking-widest truncate">
              {paper.authors.join(', ')}
            </p>
          </div>
        </div>

        {/* Script / Lyrics Overlay (Music-player style) */}
        {showScript && (
          <div className="absolute inset-x-0 top-0 bottom-[140px] bg-paper z-30 p-8 pt-12 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="max-w-md mx-auto space-y-8 pb-12">
              <div className="flex justify-between items-center mb-12">
                <h4 className="font-mono text-xs uppercase font-black tracking-widest border-b-2 border-ink pb-2">Script / Teleprompter</h4>
                <button onClick={() => setShowScript(false)} className="p-2 border-2 border-ink rounded-full">
                  <X size={16} />
                </button>
              </div>
              {segments.map((seg, i) => (
                <div 
                  key={i}
                  className={`transition-all duration-700 ${
                    curSegIdx === i 
                      ? 'opacity-100 scale-105 origin-left' 
                      : 'opacity-20 blur-[1px]'
                  }`}
                >
                  <p className={`font-display text-3xl leading-snug italic font-black uppercase tracking-tighter ${curSegIdx === i ? 'text-editorial' : 'text-ink'}`}>
                    {seg.text}
                  </p>
                </div>
              ))}
              {(isGenerating || isAudioGenerating) && (
                <div className="animate-pulse space-y-4 opacity-10">
                   <div className="h-8 bg-ink w-full" />
                   <div className="h-8 bg-ink w-3/4" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-x-4 top-20 bg-paper z-40 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b-2 border-ink pb-4">
              <h4 className="font-mono text-[10px] uppercase font-black tracking-widest">Player Settings</h4>
              <button onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase font-black tracking-widest text-ink/40">Narrator Voice</label>
                <select 
                  value={voice}
                  onChange={(e) => {
                    setVoice(e.target.value)
                    setIsAudioReady(false)
                    setShowSettings(false)
                  }}
                  className="w-full bg-paper border-2 border-ink p-3 font-mono text-xs focus:ring-0 outline-none"
                >
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border-2 border-ink bg-ink/5">
                  <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Compute</p>
                  <p className="font-mono text-[10px] font-black uppercase">{device}</p>
                </div>
                <div className="p-3 border-2 border-ink bg-ink/5">
                  <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Status</p>
                  <p className="font-mono text-[10px] font-black uppercase truncate">{modelStatus}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Persistent Bottom Player Controls */}
        <div className="bg-paper border-t-4 border-ink p-6 pb-10 space-y-6 relative z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 border-2 border-ink bg-paper relative cursor-pointer overflow-hidden group">
              <div 
                className="absolute inset-y-0 left-0 bg-editorial transition-all duration-300" 
                style={{ width: `${(currentTime / (totalDuration || 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[9px] uppercase font-black tracking-widest text-ink/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowScript(!showScript)}
              className={`p-3 transition-colors ${showScript ? 'text-editorial' : 'text-ink/40 hover:text-ink'}`}
            >
              <List size={20} />
            </button>

            <div className="flex items-center gap-8">
              <button 
                onClick={() => {
                  const prev = Math.max(0, curSegIdx - 1)
                  stopAll()
                  playSegment(prev)
                }}
                disabled={curSegIdx <= 0}
                className="text-ink hover:text-editorial transition-colors disabled:opacity-20"
              >
                <SkipBack size={28} fill="currentColor" />
              </button>

              <button 
                onClick={() => {
                  if (isPlaying) pausePlayback()
                  else {
                    if (curSegIdx === -1) playSegment(0)
                    else playSegment(curSegIdx, segOffsetRef.current)
                  }
                }}
                disabled={!isAudioReady && !isPlaying}
                className="w-20 h-20 rounded-full border-4 border-ink flex items-center justify-center bg-ink text-paper hover:bg-editorial hover:border-editorial transition-all active:scale-95 disabled:opacity-20 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} className="ml-2" fill="currentColor" />}
              </button>

              <button 
                onClick={() => {
                  const next = Math.min(segments.length - 1, curSegIdx + 1)
                  stopAll()
                  playSegment(next)
                }}
                disabled={curSegIdx === -1 || curSegIdx >= segments.length - 1}
                className="text-ink hover:text-editorial transition-colors disabled:opacity-20"
              >
                <SkipForward size={28} fill="currentColor" />
              </button>
            </div>

            <button 
              onClick={() => { stopAll(); playSegment(0); }}
              className="p-3 text-ink/40 hover:text-ink transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
