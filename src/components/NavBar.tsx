import { ArrowLeft, Inbox, BookOpen } from 'lucide-react'
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
    <header className="backdrop-blur-md bg-white/5 border-b border-cyan-500/20 sticky top-0 z-40 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">Σ</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-400 bg-clip-text text-transparent">
                xresearcher
              </h1>
            </div>

            {isReaderMode && (
              <button
                onClick={onExitReader}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 hover:border-cyan-500/60 text-cyan-300 hover:text-cyan-200 rounded-lg font-medium transition-all duration-300 group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          {!isReaderMode && (
            <div className="mt-4 flex gap-2 sm:gap-3">
              <button
                onClick={() => onTabChange('inbox')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'inbox'
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40'
                }`}
              >
                <Inbox size={18} />
                <span>Inbox</span>
              </button>
              <button
                onClick={() => onTabChange('library')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'library'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40'
                }`}
              >
                <BookOpen size={18} />
                <span>Library</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
