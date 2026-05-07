import { Download, Loader2, X, AlertCircle } from 'lucide-react'
import type { ModelConfig } from '../lib/models'
import { MODELS } from '../lib/models'

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-paper border-4 border-ink max-w-md w-full shadow-[8px_8px_0px_0px_var(--ink)] relative flex flex-col max-h-[90vh]">
        
        {/* Masthead */}
        <div className="p-8 pb-4 border-b-2 border-ink">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">Engine Provisioning</h2>
             {!isDownloading && (
               <button onClick={onSkip} className="text-ink/40 hover:text-editorial transition-colors">
                 <X size={20} />
               </button>
             )}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">Local Intelligence Node Configuration</p>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {error ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-editorial/5 border border-editorial/20">
                <AlertCircle className="text-editorial shrink-0" size={20} />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase font-bold text-editorial">Connection Terminated</p>
                  <p className="text-xs font-body italic">{error}</p>
                </div>
              </div>
              <button
                onClick={onRetry}
                className="w-full py-4 bg-ink text-paper hover:bg-editorial transition-colors font-mono text-[10px] uppercase font-black tracking-widest"
              >
                Re-initialize Handshake
              </button>
            </div>
          ) : isDownloading ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase font-black tracking-widest">Retrieving Weights</p>
                    <p className="text-[10px] font-mono text-ink/40">{progressMessage}</p>
                  </div>
                  <p className="font-mono text-2xl font-black">{Math.round(progress)}%</p>
                </div>
                <div className="h-4 bg-divider border-2 border-ink relative overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-editorial transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Decorative Scanline */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-paper/20 to-transparent w-20 animate-[scan_2s_linear_infinite]" />
                </div>
              </div>

              <div className="p-4 bg-ink/5 border-l-4 border-ink">
                <p className="text-[10px] font-mono leading-relaxed italic opacity-60">
                  Secure local synthesis requires a one-time allocation of neural weights. Data remains on-device.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="font-body text-sm leading-relaxed text-ink/80 italic">
                Select a local inference engine to enable knowledge synthesis and document traversal. Higher parameter counts require additional memory.
              </p>

              <div className="space-y-3">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => onDownload(model)}
                    disabled={currentModel?.id === model.id}
                    className={`w-full group relative p-4 border-2 border-ink text-left transition-all ${
                      currentModel?.id === model.id 
                        ? 'bg-ink text-paper' 
                        : 'bg-paper hover:bg-neutral-50 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--ink)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-black uppercase tracking-tight">{model.label}</p>
                          {currentModel?.id === model.id && (
                            <span className="text-[8px] font-mono uppercase px-1 bg-editorial text-paper">Active</span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-ink/50 uppercase">{model.size} • {model.id}</p>
                      </div>
                      <Download size={14} className={currentModel?.id === model.id ? 'text-editorial' : 'text-ink/20'} />
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={onSkip}
                className="w-full py-4 border-2 border-ink hover:bg-ink hover:text-paper transition-all font-mono text-[10px] uppercase font-black tracking-widest"
              >
                Proceed Without Engine
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-editorial/5 border-t border-ink text-center">
          <p className="font-mono text-[8px] uppercase tracking-tighter text-editorial/60">
            xresearcher Local Intelligence Node Protocol v0.1
          </p>
        </div>
      </div>
    </div>
  )
}
