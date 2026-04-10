import { useState } from 'react'
import { Zap, HardDrive, CheckCircle2, AlertCircle, Download, X } from 'lucide-react'
import { PRESET_MODELS, loadModelConfig, saveModelConfig } from '../lib/models'
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
  const [customFilename, setCustomFilename] = useState('')

  const handleDownload = () => {
    if (isCustom) {
      if (!customRepo || !customFilename) {
        alert('Please enter both repo ID and filename')
        return
      }
      const customConfig: ModelConfig = {
        repoId: customRepo,
        filename: customFilename,
        label: `Custom: ${customRepo}`,
        sizeGB: 0
      }
      saveModelConfig(customConfig)
      onDownload(customConfig)
    } else {
      saveModelConfig(selectedModel)
      onDownload(selectedModel)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-4 border-ink p-8 max-w-md w-full shadow-[8px_8px_0px_0px_#111111] relative max-h-screen overflow-y-auto">
        {/* Close Button Style Skip */}
        {!isDownloading && (
          <button 
            onClick={onSkip}
            className="absolute top-4 right-4 text-ink/40 hover:text-editorial transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="mb-8 border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Download size={24} className="text-ink" />
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">
              Public Notice
            </h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
            Subject: Local Intelligence Engine Setup
          </p>
        </div>

        {/* Show current model if loaded */}
        {currentModel && !isDownloading && !error && (
          <div className="mb-6 p-4 border border-ink bg-neutral-100 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-ink mt-0.5 flex-shrink-0" />
            <p className="text-xs font-mono uppercase tracking-tight">
              Active Configuration: <span className="font-black italic">{currentModel.label}</span>
            </p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <p className="font-body text-sm leading-relaxed text-justify">
            To enable <span className="font-bold italic">editorial summarization</span> on this device, a local AI model must be retrieved. This process ensures your research remains private and processed strictly within your hardware environment.
          </p>

          <div className="grid grid-cols-2 gap-4 border-y border-divider py-4">
            <div className="space-y-1">
              <p className="font-mono text-[10px] font-black uppercase text-editorial">Security</p>
              <p className="text-[10px] leading-tight text-ink/60">Zero data exit policy. All inference occurs locally.</p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[10px] font-black uppercase text-editorial">Performance</p>
              <p className="text-[10px] leading-tight text-ink/60">Once cached, summaries are generated instantly.</p>
            </div>
          </div>
        </div>

        {/* Model selection - only show when not downloading/error */}
        {!isDownloading && !error && (
          <div className="mb-8 space-y-0 border-ink border-l border-t newsprint-grid">
            {PRESET_MODELS.map((model) => (
              <label
                key={model.repoId}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                  !isCustom && selectedModel.repoId === model.repoId ? 'bg-ink text-paper' : 'hover:bg-neutral-100'
                }`}
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
                  <p className="font-display font-bold uppercase tracking-tight leading-none mb-1">{model.label}</p>
                  <p className={`font-mono text-[10px] ${!isCustom && selectedModel.repoId === model.repoId ? 'text-paper/60' : 'text-ink/40'}`}>
                    Payload Size: {model.sizeGB ? `${model.sizeGB} GB` : 'Variable'}
                  </p>
                </div>
              </label>
            ))}

            {/* Custom option */}
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
                <p className="font-display font-bold uppercase tracking-tight leading-none mb-1">Custom GGUF Archive</p>
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
                placeholder="meta-llama/Llama-2-7b-hf"
                value={customRepo}
                onChange={(e) => setCustomRepo(e.target.value)}
                className="w-full px-3 py-2 border-b-2 border-ink bg-transparent font-mono text-xs focus:outline-none focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase font-black">GGUF Filename</label>
              <input
                type="text"
                placeholder="model.gguf"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
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

        {/* Actions */}
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
            <>
              <button
                onClick={handleDownload}
                className="group relative w-full py-4 bg-ink text-paper hover:bg-editorial transition-colors"
              >
                <span className="relative z-10 font-mono uppercase text-xs font-black tracking-[0.2em]">Initiate Download</span>
                <div className="absolute inset-0 border-2 border-ink group-hover:border-editorial translate-x-1 translate-y-1 -z-0 transition-colors" />
              </button>
              <button
                onClick={onSkip}
                className="w-full py-4 text-ink/40 hover:text-ink font-mono uppercase text-[10px] font-black tracking-widest transition-colors"
              >
                Proceed Without AI
              </button>
            </>
          )}
        </div>

        <p className="text-[9px] font-mono text-ink/30 text-center mt-8 uppercase leading-relaxed">
          Registry: Vol 1.0 // Distributed by XRESEARCHER ARCHIVE // Printed in NYC
        </p>
      </div>
    </div>
  )
}
