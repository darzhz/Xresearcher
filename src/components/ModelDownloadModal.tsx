import { useState } from 'react'
import { Zap, HardDrive, CheckCircle2, AlertCircle, Download } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/80 via-blue-900/40 to-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
            <Download size={20} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            AI Model Setup
          </h2>
        </div>

        {/* Show current model if loaded */}
        {currentModel && !isDownloading && !error && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Currently loaded: <strong>{currentModel.label}</strong>
            </p>
          </div>
        )}

        <p className="text-cyan-300/80 mb-4 text-sm">
          Choose an AI model to enable paper summarization with on-device AI.
        </p>

        <div className="space-y-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-cyan-300">Fast & Private</p>
              <p className="text-cyan-300/70 text-xs">
                Model runs locally. No data leaves your device.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <HardDrive size={20} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-cyan-300">Instant Access</p>
              <p className="text-cyan-300/70 text-xs">
                Once cached, the model loads instantly for summarization.
              </p>
            </div>
          </div>
        </div>

        {/* Model selection - only show when not downloading/error */}
        {!isDownloading && !error && (
          <div className="mb-4 space-y-2 max-h-48 overflow-y-auto border border-cyan-500/20 rounded-lg p-3 bg-white/5">
            {PRESET_MODELS.map((model) => (
              <label
                key={model.repoId}
                className="flex items-start gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="model"
                  checked={!isCustom && selectedModel.repoId === model.repoId}
                  onChange={() => {
                    setSelectedModel(model)
                    setIsCustom(false)
                  }}
                  className="mt-1 accent-cyan-400"
                />
                <div className="text-sm flex-1">
                  <p className="font-medium text-cyan-100">{model.label}</p>
                  <p className="text-xs text-cyan-300/60">
                    {model.sizeGB ? `~${model.sizeGB}GB` : 'Size varies'}
                  </p>
                </div>
              </label>
            ))}

            {/* Custom option */}
            <label className="flex items-start gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer border-t border-cyan-500/20 pt-3 mt-2 transition-colors">
              <input
                type="radio"
                name="model"
                checked={isCustom}
                onChange={() => setIsCustom(true)}
                className="mt-1 accent-cyan-400"
              />
              <div className="text-sm flex-1">
                <p className="font-medium text-cyan-100">Custom Model</p>
                <p className="text-xs text-cyan-300/60">Use your own HF GGUF model</p>
              </div>
            </label>
          </div>
        )}

        {/* Custom model inputs */}
        {isCustom && !isDownloading && !error && (
          <div className="mb-4 space-y-2 p-3 bg-white/5 rounded-lg border border-cyan-500/20">
            <input
              type="text"
              placeholder="HF Repo ID (e.g., meta-llama/Llama-2-7b-hf)"
              value={customRepo}
              onChange={(e) => setCustomRepo(e.target.value)}
              className="w-full px-3 py-2 border border-cyan-500/30 bg-white/5 text-cyan-100 placeholder-cyan-300/50 rounded-lg text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            />
            <input
              type="text"
              placeholder="GGUF filename (e.g., model.gguf)"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="w-full px-3 py-2 border border-cyan-500/30 bg-white/5 text-cyan-100 placeholder-cyan-300/50 rounded-lg text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            />
          </div>
        )}

        {/* Download in progress */}
        {isDownloading && (
          <div className="mb-4 space-y-3">
            <div className="w-full bg-white/5 border border-cyan-500/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full transition-all duration-300 shadow-lg shadow-cyan-500/50"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-cyan-300 text-center font-medium">
              {progressMessage}
            </p>
            <p className="text-xs text-cyan-300/60 text-center">
              {progress}%
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          {isDownloading ? (
            <p className="text-sm text-cyan-300/60 text-center py-3">
              Please wait while the model downloads...
            </p>
          ) : error ? (
            <>
              <button
                onClick={handleDownload}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
              >
                Try Again
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-3 bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40 rounded-lg font-medium transition-all duration-300"
              >
                Skip for Now
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
              >
                Download Model
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-3 bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40 rounded-lg font-medium transition-all duration-300"
              >
                Skip for Now
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-cyan-300/50 text-center mt-4">
          Download anytime from settings. Your device, your data.
        </p>
      </div>
    </div>
  )
}
