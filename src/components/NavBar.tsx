import { ArrowLeft, Inbox, BookOpen, Newspaper } from 'lucide-react'
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
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <header className="bg-paper border-b-4 border-ink sticky top-0 z-40">
      {/* Top Edition Bar */}
      <div className="border-b border-ink px-4 py-1 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-ink/60">
        <span>Vol. XXIV — No. 112</span>
        <span className="hidden sm:inline">Statistical Inference Driven Research Intelligence</span>
        <span>{today}</span>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              {/* Left Spacer for centering */}
              <div className="w-24 hidden sm:block">
                {isReaderMode && (
                  <button
                    onClick={onExitReader}
                    className="flex items-center gap-2 text-ink hover:text-editorial transition-colors font-mono uppercase text-xs tracking-tighter"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                )}
              </div>

              {/* Central Masthead */}
              <div className="flex flex-col items-center group cursor-default">
                <div className="flex items-center gap-3">
                  <Newspaper size={32} className="text-ink group-hover:text-editorial transition-colors" strokeWidth={1.5} />
                  <h1 className="text-4xl sm:text-7xl font-display font-black text-ink uppercase tracking-tighter text-center">
                    xresearcher
                  </h1>
                </div>
                <div className="h-px w-full bg-ink mt-2" />
                <div className="h-[2px] w-full bg-ink mt-0.5" />
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink/80">
                  All the Research That's Fit to Summarize
                </p>
              </div>

              {/* Right Menu Button (Mobile) */}
              <div className="w-24 flex justify-end">
                {isReaderMode && (
                  <button
                    onClick={onExitReader}
                    className="sm:hidden text-ink hover:text-editorial transition-colors"
                  >
                    <ArrowLeft size={24} />
                  </button>
                )}
              </div>
            </div>

            {!isReaderMode && (
              <nav className="flex items-center justify-center border-y border-ink w-full py-2 gap-8 sm:gap-16">
                <button
                  onClick={() => onTabChange('inbox')}
                  className={`flex items-center gap-2 font-mono uppercase text-sm tracking-widest transition-colors hover:text-editorial ${
                    activeTab === 'inbox' ? 'text-editorial font-bold' : 'text-ink'
                  }`}
                >
                  <Inbox size={16} strokeWidth={2} />
                  <span>Inbox</span>
                </button>
                <button
                  onClick={() => onTabChange('library')}
                  className={`flex items-center gap-2 font-mono uppercase text-sm tracking-widest transition-colors hover:text-editorial ${
                    activeTab === 'library' ? 'text-editorial font-bold' : 'text-ink'
                  }`}
                >
                  <BookOpen size={16} strokeWidth={2} />
                  <span>Library</span>
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
