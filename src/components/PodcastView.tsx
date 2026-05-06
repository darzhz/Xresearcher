import { useEffect, useRef, useState } from 'react'
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
  Volume2
} from 'lucide-react'
import { KokoroTTS } from 'kokoro-js'
import { PaperData } from '../types'

interface PodcastViewProps {
  paper: PaperData
  script: string
  onClose: () => void
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

export function PodcastView({ paper, script, onClose }: PodcastViewProps) {
  // TTS & Audio State
  const [tts, setTts] = useState<any>(null)
  const [loadingModel, setLoadingModel] = useState(true)
  const [modelStatus, setModelStatus] = useState('Initializing...')
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm')
  
  const [segments, setSegments] = useState<Segment[]>([])
  const [curSegIdx, setCurSegIdx] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voice, setVoice] = useState('af_heart')
  const [speed, setSpeed] = useState(1.0)
  
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const segmentsRef = useRef<Segment[]>([])
  const curSegIdxRef = useRef(-1)
  const playingRef = useRef(false)
  const segStartedAtRef = useRef(0)
  const segOffsetRef = useRef(0)
  const elapsedBeforeCurRef = useRef(0)

  // Initialize
  useEffect(() => {
    const init = async () => {
      const gpuAvailable = !!(navigator as any).gpu
      let selectedDevice: 'webgpu' | 'wasm' = 'wasm'
      if (gpuAvailable) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter()
          if (adapter) selectedDevice = 'webgpu'
        } catch (e) { console.error('GPU detection failed', e) }
      }
      setDevice(selectedDevice)
      
      try {
        const dtype = selectedDevice === 'webgpu' ? 'fp32' : 'q8'
        setModelStatus(`Loading Kokoro-82M (${selectedDevice.toUpperCase()})...`)
        
        const model = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          device: selectedDevice,
          dtype: dtype,
        })
        
        setTts(model)
        setLoadingModel(false)
        setModelStatus('Model Ready')
      } catch (err) {
        console.error('Failed to load TTS model', err)
        setModelStatus('Error loading model')
      }
    }
    
    init()
    
    return () => {
      stopAll()
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  // Generate speech segments when script and tts are ready
  useEffect(() => {
    if (tts && script) {
      generateSpeech()
    }
  }, [tts, script, voice, speed])

  const generateSpeech = async () => {
    stopAll()
    
    const parts = script.match(/[^.!?\n]+[.!?\n]*/g) || [script]
    const newSegments: Segment[] = parts.map(p => ({
      text: p.trim(),
      buf: null,
      status: 'pending' as const
    })).filter(s => s.text.length > 2)
    
    setSegments(newSegments)
    segmentsRef.current = newSegments
    setCurSegIdx(-1)
    curSegIdxRef.current = -1
    setTotalDuration(0)
    setCurrentTime(0)
    elapsedBeforeCurRef.current = 0
    segOffsetRef.current = 0

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      analyserRef.current.connect(audioCtxRef.current.destination)
    }

    let totalDur = 0
    const startTime = performance.now()
    
    // Synthesize segments
    for (let i = 0; i < newSegments.length; i++) {
      updateSegmentStatus(i, 'loading')
      try {
        const out = await tts.generate(newSegments[i].text, { voice, speed })
        const f32 = out.audio instanceof Float32Array ? out.audio : new Float32Array(out.audio)
        const sr = out.sampling_rate || 24000
        
        const buf = audioCtxRef.current.createBuffer(1, f32.length, sr)
        buf.copyToChannel(f32, 0)
        
        newSegments[i].buf = buf
        newSegments[i].status = 'ready'
        totalDur += buf.duration
        
        setSegments([...newSegments])
        segmentsRef.current = [...newSegments]
        setTotalDuration(totalDur)
      } catch (err) {
        console.error(`Failed to generate segment ${i}`, err)
        updateSegmentStatus(i, 'error')
      }
    }

    const duration = (performance.now() - startTime).toFixed(2)
    console.log(`[Audio Synthesis Complete]: ${newSegments.length} segments in ${duration}ms (Total Audio: ${totalDur.toFixed(2)}s)`)
  }

  const updateSegmentStatus = (idx: number, status: Segment['status']) => {
    setSegments(prev => {
      const next = [...prev]
      if (next[idx]) next[idx].status = status
      return next
    })
    if (segmentsRef.current[idx]) segmentsRef.current[idx].status = status
  }

  const playSegment = (idx: number, offset = 0) => {
    if (idx < 0 || idx >= segmentsRef.current.length) {
      onPlaybackEnded()
      return
    }

    const seg = segmentsRef.current[idx]
    if (!seg?.buf) {
      // Skip if not ready
      setCurSegIdx(idx + 1)
      curSegIdxRef.current = idx + 1
      playSegment(idx + 1)
      return
    }

    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()

    const src = audioCtxRef.current!.createBufferSource()
    src.buffer = seg.buf
    src.connect(analyserRef.current!)
    srcNodeRef.current = src

    updateSegmentStatus(idx, 'playing')
    setCurSegIdx(idx)
    curSegIdxRef.current = idx

    src.onended = () => {
      if (!playingRef.current) return
      updateSegmentStatus(idx, 'done')
      elapsedBeforeCurRef.current += seg.buf!.duration
      setCurSegIdx(idx + 1)
      curSegIdxRef.current = idx + 1
      playSegment(idx + 1)
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
    
    segmentsRef.current.forEach((s, i) => {
      if (s.buf) updateSegmentStatus(i, 'ready')
    })

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const onPlaybackEnded = () => {
    setIsPlaying(false)
    playingRef.current = false
    setCurrentTime(totalDuration)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const animate = () => {
    if (!canvasRef.current || !analyserRef.current) return
    rafRef.current = requestAnimationFrame(animate)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Update progress
    const ct = playingRef.current 
      ? elapsedBeforeCurRef.current + (audioCtxRef.current!.currentTime - segStartedAtRef.current)
      : elapsedBeforeCurRef.current + segOffsetRef.current
    setCurrentTime(ct)

    // Visualizer
    const td = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(td)
    
    ctx.beginPath()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    
    const sliceWidth = W / td.length
    let x = 0
    
    for (let i = 0; i < td.length; i++) {
      const v = td[i] / 128.0
      const y = v * H / 2
      
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      
      x += sliceWidth
    }
    
    ctx.lineTo(W, H / 2)
    ctx.stroke()

    // Frequency bars
    const fd = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(fd)
    
    const barWidth = (W / fd.length) * 2.5
    let barX = 0
    
    ctx.globalAlpha = 0.1
    for (let i = 0; i < fd.length; i++) {
      const barHeight = (fd[i] / 255) * H
      ctx.fillStyle = '#000000'
      ctx.fillRect(barX, H - barHeight, barWidth, barHeight)
      barX += barWidth + 1
    }
    ctx.globalAlpha = 1.0
  }

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] newsprint-texture" />

      {/* Header */}
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
            <div className={`w-2 h-2 rounded-full ${loadingModel ? 'bg-editorial animate-pulse' : 'bg-green-600'}`} />
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 relative z-10">
        {/* Left: Script/Teleprompter */}
        <section className="lg:col-span-2 border-r-4 border-ink flex flex-col overflow-hidden">
          <div className="p-4 border-b-2 border-ink bg-ink/5 flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase font-black tracking-widest">Script Teleprompter</span>
            <span className="font-mono text-[10px] text-ink/40">{segments.length} Segments</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-8 custom-scrollbar">
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
              </div>
            ))}
          </div>
        </section>

        {/* Right: Controls & Viz */}
        <section className="bg-editorial/5 flex flex-col overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Visualizer Card */}
            <div className="border-4 border-ink bg-paper aspect-square relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full" width={400} height={400} />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!isPlaying && curSegIdx === -1 && (
                  <div className="text-center space-y-4">
                    <Mic2 size={48} className="mx-auto text-ink/10" />
                    <p className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/20">Studio Idle</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 bg-paper border-2 border-ink p-3 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-editorial animate-pulse" />
                 <div className="flex-1 overflow-hidden">
                    <p className="font-mono text-[9px] uppercase font-black tracking-widest truncate">
                      {isPlaying ? 'Live Synthesis' : 'Buffer Ready'}
                    </p>
                    <p className="font-display text-[10px] truncate italic">
                      {paper.title}
                    </p>
                 </div>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="space-y-6">
              {/* Progress Bar */}
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

              {/* Buttons */}
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
                  disabled={segments.every(s => s.status !== 'ready' && s.status !== 'done')}
                  className="p-6 border-4 border-ink bg-ink text-paper hover:bg-editorial hover:border-editorial transition-all disabled:opacity-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
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

            {/* Settings */}
            <div className="border-t-2 border-ink pt-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Volume2 size={16} />
                   <label className="font-mono text-[10px] uppercase font-black tracking-widest">Narrator Voice</label>
                </div>
                <select 
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-paper border-2 border-ink p-3 font-mono text-xs focus:ring-2 focus:ring-editorial outline-none"
                >
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <Zap size={16} />
                     <label className="font-mono text-[10px] uppercase font-black tracking-widest">Playback Speed</label>
                   </div>
                   <span className="font-mono text-xs font-bold bg-ink text-paper px-2 py-0.5">{speed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-editorial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 border-2 border-ink bg-paper text-center">
                    <Cpu size={20} className="mx-auto mb-2 text-ink/40" />
                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Compute Unit</p>
                    <p className="font-mono text-[10px] font-black uppercase">{device}</p>
                 </div>
                 <div className="p-4 border-2 border-ink bg-paper text-center">
                    <div className="mx-auto mb-2 flex items-center justify-center h-5">
                       {loadingModel ? <Loader2 size={16} className="animate-spin text-editorial" /> : <div className="w-4 h-4 rounded-full bg-green-600" />}
                    </div>
                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-1">Pipeline Status</p>
                    <p className="font-mono text-[10px] font-black uppercase">{loadingModel ? 'Active' : 'Standby'}</p>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
