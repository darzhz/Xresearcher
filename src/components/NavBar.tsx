import type { AppView } from '../types'

interface NavBarProps {
  activeTab: Exclude<AppView, 'reader'>
  onTabChange: (tab: Exclude<AppView, 'reader'>) => void
  isReaderMode: boolean
  onExitReader?: () => void
}

export function NavBar({
  activeTab,
  onTabChange,
  isReaderMode,
  onExitReader
}: NavBarProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🔬 xresearcher
          </h1>
          {isReaderMode && (
            <button
              onClick={onExitReader}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
            >
              ← Back
            </button>
          )}
        </div>

        {!isReaderMode && (
          <div className="flex gap-4 border-t border-gray-200 pt-4">
            <button
              onClick={() => onTabChange('inbox')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📬 Inbox
            </button>
            <button
              onClick={() => onTabChange('library')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'library'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📚 Library
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
