import { useState, useEffect } from 'react'
import { Zap, HardDrive, CheckCircle2, AlertCircle, Download, X, Cpu, Trash2 } from 'lucide-react'
import { MODELS, loadModelConfig, saveModelConfig, deleteModel, getStorageEstimate } from '../lib/models'
import type { ModelConfig } from '../lib/models'

interface ModelDownloadModalProps {
  isOpen: boolean
  isDownloading: boolean
  progress: number
  progressMessage: string
  error: string | null
  currentModel: ModelConfig | null
  onDownload: (config: ModelConfig) => void
  onSkip: () => void
  onRetry: () => void
}

export function ModelDownloadModal({
  isOpen,
  isDownloading,
  progress,
  progressMessage,
  error,
  currentModel,
  onDownload,
  onSkip,
  onRetry
}: ModelDownloadModalProps) {
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(loadModelConfig())
  const [isCustom, setIsCustom] = useState(false)
  const [customRepo, setCustomRepo] = useState('')
  const [hasGPU, setHasGPU] = useState(false)
  const [forceBackend, setForceBackend] = useState<'webgpu' | 'wasm' | null>(null)
  const [storage, setStorage] = useState<{usageGB: string, quotaGB: string} | null>(null)

  useEffect(() => {
    const checkGPU = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter()
          setHasGPU(!!adapter)
        } catch {
          setHasGPU(false)
        }
      }
    }
    const checkStorage = async () => {
      const est = await getStorageEstimate()
      setStorage(est)
    }
    if (isOpen) {
      checkGPU()
      checkStorage()
    }
  }, [isOpen])

  const handleDownload = () => {
    let config: ModelConfig
    if (isCustom) {
      if (!customRepo) {
        alert('Please enter repo ID')
        return
      }
      config = {
        repoId: customRepo,
        filename: 'onnx',
        label: `Custom: ${customRepo}`,
        sizeGB: 0,
        preferredBackend: forceBackend || (hasGPU ? 'webgpu' : 'wasm'),
        dtype: 'q4'
      }
    } else {
      config = { 
        ...selectedModel, 
        preferredBackend: forceBackend || selectedModel.preferredBackend 
      }
    }
    saveModelConfig(config)
    onDownload(config)
  }

  const handleDeleteCache = async () => {
    if (confirm('Wipe local model cache?')) {
      await deleteModel('')
      window.location.reload()
    }
  }

  if (!isOpen) return null

  const isModelActive = (repoId: string) => currentModel?.repoId === repoId

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-4 border-ink max-w-md w-full shadow-[8px_8px_0px_0px_#111111] relative flex flex-col max-h-[90vh]">
        
        {/* FIXED HEADER */}
        <div className="p-8 pb-4 border-b-2 border-ink bg-paper z-10">
          {!isDownloading && (
            <button 
              onClick={onSkip}
              className="absolute top-4 right-4 text-ink/40 hover:text-editorial transition-colors"
            >
              <X size={20} />
            </button>
          )}
          <div className="flex items-center gap-3 mb-2">
            <Download size={24} className="text-ink" />
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">
              Engine Setup
            </h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
            Subject: Local Intelligence Configuration
          </p>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 py-4 newsprint-scrollbar">
          {storage && (
            <div className="mb-6 p-3 border border-ink/10 bg-neutral-50 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Local Storage Usage</span>
              <span className="font-mono text-[10px] font-black">{storage.usageGB} GB / {storage.quotaGB} GB</span>
            </div>
          )}

          {/* Show current model if loaded */}
          {currentModel && !isDownloading && !error && (
            <div className="mb-6 p-4 border border-ink bg-neutral-100 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-ink mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-mono uppercase tracking-tight">
                  Active: <span className="font-black italic">{currentModel.label}</span>
                </p>
                <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">Status: Initialized & Running</p>
              </div>
            </div>
          )}

          {/* Backend Toggle */}
          {!isDownloading && !error && (
            <div className="mb-6 space-y-2">
              <label className="font-mono text-[10px] uppercase font-black">Inference Backend</label>
              <div className="flex border-2 border-ink">
                <button
                  onClick={() => setForceBackend('webgpu')}
                  disabled={!hasGPU}
                  className={`flex-1 py-2 font-mono text-[10px] uppercase font-black flex items-center justify-center gap-2 transition-colors ${
                    (forceBackend === 'webgpu' || (!forceBackend && hasGPU)) ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-neutral-100 disabled:opacity-30'
                  }`}
                >
                  <Zap size={14} /> WebGPU {hasGPU ? '(Detected)' : '(N/A)'}
                </button>
                <button
                  onClick={() => setForceBackend('wasm')}
                  className={`flex-1 py-2 font-mono text-[10px] uppercase font-black flex items-center justify-center gap-2 transition-colors ${
                    (forceBackend === 'wasm' || (!forceBackend && !hasGPU)) ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-neutral-100'
                  }`}
                >
                  <Cpu size={14} /> WASM
                </button>
              </div>
            </div>
          )}

          {/* Model selection */}
          {!isDownloading && !error && (
            <div className="mb-8 space-y-0 border-ink border-l border-t newsprint-grid">
              {MODELS.map((model) => (
                <label
                  key={model.repoId}
                  className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                    !isCustom && selectedModel.repoId === model.repoId ? 'bg-ink text-paper' : 'hover:bg-neutral-100'
                  } ${isModelActive(model.repoId) ? 'ring-2 ring-editorial ring-inset' : ''}`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={!isCustom && selectedModel.repoId === model.repoId}
                    onChange={() => {
                      setSelectedModel(model)
                      setIsCustom(false)
                    }}
                    className="mt-1 accent-editorial sr-only"
                  />
                  <div className="text-sm flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-display font-bold uppercase tracking-tight leading-none">{model.label}</p>
                      {isModelActive(model.repoId) && <span className="text-[9px] bg-editorial text-paper px-1 font-mono uppercase">Live</span>}
                    </div>
                    <p className={`font-mono text-[10px] ${!isCustom && selectedModel.repoId === model.repoId ? 'text-paper/60' : 'text-ink/40'}`}>
                      Payload: {model.sizeGB} GB | Format: {model.dtype?.toUpperCase()}
                    </p>
                  </div>
                </label>
              ))}

              <label className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                isCustom ? 'bg-ink text-paper' : 'hover:bg-neutral-100'
              }`}>
                <input
                  type="radio"
                  name="model"
                  checked={isCustom}
                  onChange={() => setIsCustom(true)}
                  className="mt-1 accent-editorial sr-only"
                />
                <div className="text-sm flex-1">
                  <p className="font-display font-bold uppercase tracking-tight leading-none mb-1">Custom ONNX Archive</p>
                  <p className={`font-mono text-[10px] ${isCustom ? 'text-paper/60' : 'text-ink/40'}`}>Use external HF repository</p>
                </div>
              </label>
            </div>
          )}

          {/* Custom model inputs */}
          {isCustom && !isDownloading && !error && (
            <div className="mb-8 space-y-4 p-4 border-2 border-ink bg-neutral-50">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase font-black">HF Repository ID</label>
                <input
                  type="text"
                  placeholder="onnx-community/Llama-3.2-1B-Instruct"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  className="w-full px-3 py-2 border-b-2 border-ink bg-transparent font-mono text-xs focus:outline-none focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Download in progress */}
          {isDownloading && (
            <div className="mb-8 space-y-4">
              <div className="w-full border-2 border-ink h-6 bg-divider relative overflow-hidden">
                <div
                  className="bg-ink h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-black mix-blend-difference text-paper">
                  {progress}% COMPLETE
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase font-black text-center animate-pulse">
                Transmission in progress: {progressMessage}
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-8 p-4 border-2 border-editorial bg-editorial/5 flex items-start gap-3">
              <AlertCircle size={18} className="text-editorial mt-0.5 flex-shrink-0" />
              <p className="text-xs font-mono uppercase font-black text-editorial leading-tight">{error}</p>
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="p-8 pt-4 border-t-2 border-ink bg-paper z-10">
          <div className="flex flex-col gap-3">
            {isDownloading ? (
              <p className="font-mono text-[10px] text-ink/40 text-center italic py-4">
                Interrupting this process may cause archive corruption.
              </p>
            ) : error ? (
              <>
                <button
                  onClick={handleDownload}
                  className="w-full py-4 bg-editorial text-paper font-mono uppercase text-xs font-black tracking-[0.2em] hover:bg-ink transition-colors"
                >
                  Re-attempt Transmission
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-4 border-2 border-ink text-ink font-mono uppercase text-xs font-black tracking-[0.2em] hover:bg-neutral-100 transition-colors"
                >
                  Defer Setup
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleDownload}
                  disabled={isModelActive(selectedModel.repoId)}
                  className={`group relative w-full py-4 transition-colors ${isModelActive(selectedModel.repoId) ? 'bg-neutral-100 text-ink/20 cursor-not-allowed' : 'bg-ink text-paper hover:bg-editorial'}`}
                >
                  <span className="relative z-10 font-mono uppercase text-xs font-black tracking-[0.2em]">
                    {isModelActive(selectedModel.repoId) ? 'Model Already Active' : 'Initialize & Load Engine'}
                  </span>
                  {!isModelActive(selectedModel.repoId) && <div className="absolute inset-0 border-2 border-ink group-hover:border-editorial translate-x-1 translate-y-1 -z-0 transition-colors" />}
                </button>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={onSkip}
                    className="flex-1 py-4 border-2 border-ink text-ink font-mono uppercase text-[10px] font-black tracking-widest hover:bg-neutral-50 transition-colors"
                  >
                    Close Modal
                  </button>
                  <button
                    onClick={handleDeleteCache}
                    className="p-4 border-2 border-editorial text-editorial hover:bg-editorial hover:text-paper transition-all"
                    title="Wipe Local Model Cache"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
