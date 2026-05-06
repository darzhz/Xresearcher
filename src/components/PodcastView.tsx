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
  Headphones
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
  const [activeTab, setActiveTab] = useState<'visualizer' | 'script'>('visualizer')
  
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
      
      worker.onmessage = async (e) => {
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
      if (workerRef.current) workerRef.current.terminate()
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

  const handleWorkerResult = (audioData: Float32Array, samplingRate: number) => {
    if (!audioCtxRef.current) return
    
    const idx = segmentsRef.current.findIndex(s => s.status === 'loading')
    if (idx === -1) return

    const buf = audioCtxRef.current.createBuffer(1, audioData.length, samplingRate)
    buf.copyToChannel(audioData, 0)
    
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
    <div className="fixed inset-0 z-50 bg-paper flex flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] newsprint-texture" />

      <header className="border-b-4 border-ink p-6 flex justify-between items-center bg-paper relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-ink flex items-center justify-center text-paper rounded-sm">
            <Mic2 size={24} />
          </div>
          <div>
            <h2 className="font-display font-black uppercase text-xl tracking-tight">Podcast Studio</h2>
            <p className="font-mono text-[10px] uppercase font-bold text-ink/40 tracking-widest">On-Device Synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-2 border-ink bg-paper shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className={`w-2 h-2 rounded-full ${(!isWorkerReady || isAudioGenerating) ? 'bg-editorial animate-pulse' : 'bg-green-600'}`} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
              {modelStatus}
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-ink hover:text-paper transition-colors border-2 border-transparent hover:border-ink"
          >
            <X size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row relative z-10">
        <section className="flex-1 border-r-4 border-ink flex flex-col overflow-hidden">
          <div className="flex border-b-2 border-ink bg-paper">
            <button 
              onClick={() => setActiveTab('visualizer')}
              className={`px-6 py-3 font-mono text-[10px] uppercase font-black tracking-widest border-r-2 border-ink transition-colors ${activeTab === 'visualizer' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/5'}`}
            >
              Visualizer
            </button>
            <button 
              onClick={() => setActiveTab('script')}
              className={`px-6 py-3 font-mono text-[10px] uppercase font-black tracking-widest transition-colors ${activeTab === 'script' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/5'}`}
            >
              Teleprompter
            </button>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'visualizer' ? (
              <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-editorial/5">
                <div className="w-full max-w-lg aspect-square border-4 border-ink bg-paper relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center overflow-hidden">
                   {isPlaying ? (
                      <div className="flex items-end justify-center gap-1.5 h-32">
                         {[...Array(12)].map((_, i) => (
                            <div 
                              key={i} 
                              className="w-3 bg-ink animate-waveform" 
                              style={{ 
                                 animationDelay: `${i * 0.1}s`,
                                 height: '20%' 
                              }} 
                            />
                         ))}
                      </div>
                   ) : (
                      <div className="text-center space-y-4">
                        <Mic2 size={64} className="mx-auto text-ink/10" />
                        <p className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/20">Studio Idle</p>
                      </div>
                   )}

                   <div className="absolute bottom-4 left-4 right-4 bg-paper border-2 border-ink p-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isPlaying || isAudioGenerating ? 'bg-editorial animate-pulse' : 'bg-ink/20'}`} />
                      <div className="flex-1 overflow-hidden text-left">
                         <p className="font-mono text-[9px] uppercase font-black tracking-widest truncate">
                           {isAudioGenerating ? 'Synthesizing Audio' : isPlaying ? 'Live Playback' : isGenerating ? 'Scripting' : 'System Ready'}
                         </p>
                         <p className="font-display text-[10px] truncate italic">
                           {paper.title}
                         </p>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-8 sm:p-12 space-y-8 custom-scrollbar bg-paper">
                {segments.map((seg, i) => (
                  <div 
                    key={i}
                    className={`transition-all duration-500 p-4 border-l-4 ${
                      curSegIdx === i 
                        ? 'border-editorial bg-editorial/5 opacity-100 scale-[1.02]' 
                        : seg.status === 'done' 
                          ? 'border-ink/20 opacity-40' 
                          : 'border-transparent opacity-80'
                    }`}
                  >
                    <p className={`font-display text-2xl leading-relaxed italic ${curSegIdx === i ? 'text-ink font-bold' : 'text-ink/60'}`}>
                      {seg.text}
                    </p>
                    {seg.status === 'loading' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 size={12} className="animate-spin text-editorial" />
                        <span className="font-mono text-[8px] uppercase font-bold text-editorial tracking-widest">Synthesizing...</span>
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="p-4 border-l-4 border-dashed border-ink/20 animate-pulse">
                    <p className="font-display text-2xl leading-relaxed italic text-ink/20">
                      Writing script...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="lg:w-96 bg-paper border-t-4 lg:border-t-0 lg:border-l-4 border-ink flex flex-col overflow-y-auto">
          <div className="p-8 space-y-8">
            <div className="space-y-6">
              {!isAudioReady && !isAudioGenerating && (
                <button 
                  onClick={startSynthesis}
                  disabled={isGenerating || !isWorkerReady}
                  className="w-full py-6 border-4 border-ink bg-ink text-paper hover:bg-editorial hover:border-editorial transition-all disabled:opacity-30 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-2 active:translate-y-2 flex flex-col items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={32} className="animate-spin" />
                      <span className="font-display font-black uppercase text-xl">Waiting for Script...</span>
                    </>
                  ) : (
                    <>
                      <Headphones size={32} />
                      <span className="font-display font-black uppercase text-xl">Generate Audio</span>
                    </>
                  )}
                </button>
              )}

              {isAudioGenerating && (
                <div className="w-full py-8 border-4 border-ink bg-paper flex flex-col items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <Loader2 size={48} className="animate-spin text-editorial" />
                  <div className="text-center">
                    <p className="font-display font-black uppercase text-xl text-ink">Synthesizing</p>
                    <p className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">Transforming text to voice</p>
                  </div>
                </div>
              )}

              {isAudioReady && (
                <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[10px] uppercase font-black tracking-widest">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                    <div className="h-4 border-2 border-ink bg-paper relative overflow-hidden group cursor-pointer">
                      <div 
                        className="absolute inset-y-0 left-0 bg-editorial transition-all duration-300" 
                        style={{ width: `${(currentTime / (totalDuration || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => {
                        const prev = Math.max(0, curSegIdx - 1)
                        stopAll()
                        playSegment(prev)
                      }}
                      disabled={curSegIdx <= 0}
                      className="p-4 border-2 border-ink bg-paper hover:bg-ink hover:text-paper transition-all disabled:opacity-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <SkipBack size={20} />
                    </button>

                    <button 
                      onClick={() => {
                        if (isPlaying) pausePlayback()
                        else {
                          if (curSegIdx === -1) playSegment(0)
                          else playSegment(curSegIdx, segOffsetRef.current)
                        }
                      }}
                      className="p-6 border-4 border-ink bg-ink text-paper hover:bg-editorial hover:border-editorial transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                    </button>

                    <button 
                      onClick={() => {
                        const next = Math.min(segments.length - 1, curSegIdx + 1)
                        stopAll()
                        playSegment(next)
                      }}
                      disabled={curSegIdx === -1 || curSegIdx >= segments.length - 1}
                      className="p-4 border-2 border-ink bg-paper hover:bg-ink hover:text-paper transition-all disabled:opacity-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={stopAll}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper hover:bg-editorial hover:text-paper transition-all font-mono text-[10px] uppercase font-black tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <Square size={14} fill="currentColor" />
                      <span>Stop</span>
                    </button>
                    <button 
                      onClick={() => { stopAll(); playSegment(0); }}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper transition-all font-mono text-[10px] uppercase font-black tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <RotateCcw size={14} />
                      <span>Restart</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t-2 border-ink pt-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Volume2 size={16} />
                   <label className="font-mono text-[10px] uppercase font-black tracking-widest">Narrator Voice</label>
                </div>
                <select 
                  value={voice}
                  onChange={(e) => {
                    setVoice(e.target.value)
                    setIsAudioReady(false) // Require re-synthesis if voice changes
                  }}
                  disabled={isAudioGenerating}
                  className="w-full bg-paper border-2 border-ink p-3 font-mono text-xs focus:ring-2 focus:ring-editorial outline-none disabled:opacity-50"
                >
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 border-2 border-ink bg-paper text-center">
                    <Cpu size={20} className="mx-auto mb-2 text-ink/40" />
                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Compute Unit</p>
                    <p className="font-mono text-[10px] font-black uppercase">{device}</p>
                 </div>
                 <div className="p-4 border-2 border-ink bg-paper text-center">
                    <div className="mx-auto mb-2 flex items-center justify-center h-5">
                       {(!isWorkerReady || isAudioGenerating) ? <Loader2 size={16} className="animate-spin text-editorial" /> : <div className="w-4 h-4 rounded-full bg-green-600" />}
                    </div>
                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Pipeline Status</p>
                    <p className="font-mono text-[10px] font-black uppercase">{isWorkerReady ? 'Ready' : 'Standby'}</p>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
