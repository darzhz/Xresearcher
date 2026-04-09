import { useEffect, useState } from 'react'

interface ModelDownloadModalProps {
  isOpen: boolean
  isDownloading: boolean
  progress: number
  progressMessage: string
  error: string | null
  onDownload: () => void
  onSkip: () => void
  onRetry: () => void
}

export function ModelDownloadModal({
  isOpen,
  isDownloading,
  progress,
  progressMessage,
  error,
  onDownload,
  onSkip,
  onRetry
}: ModelDownloadModalProps) {
  const [dismissedNotice, setDismissedNotice] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🤖 AI Model Available
        </h2>

        <p className="text-gray-600 mb-4">
          Download the Qwen 2.5 1.5B AI model (~1.1GB) to enable paper summarization with on-device AI.
        </p>

        <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Fast & Private</p>
              <p className="text-blue-700">
                Model runs on your device. No data leaves your browser.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💾</span>
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Cached After First Download</p>
              <p className="text-blue-700">
                Once downloaded, the model stays on your device for instant access.
              </p>
            </div>
          </div>
        </div>

        {/* Download in progress */}
        {isDownloading && (
          <div className="mb-4 space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-700 text-center">
              {progressMessage}
            </p>
            <p className="text-xs text-gray-500 text-center">
              {progress}%
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {isDownloading ? (
            <p className="text-sm text-gray-600 text-center py-2">
              Please wait while the model downloads...
            </p>
          ) : error ? (
            <>
              <button
                onClick={onRetry}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                Retry Download
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Skip for Now
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDownload}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                Download Model (~1.1GB)
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Skip (Use Inbox/Library only)
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can download the model anytime from settings.
        </p>
      </div>
    </div>
  )
}
