import { useState, useEffect } from 'react'
import { ArrowLeft, Inbox, BookOpen, Newspaper, Loader } from 'lucide-react'
import type { AppView } from '../types'

interface NavBarProps {
  activeTab: Exclude<AppView, 'reader'>
  onTabChange: (tab: Exclude<AppView, 'reader'>) => void
  isReaderMode: boolean
  onExitReader?: () => void
  summarizeProgress?: { pct: number; stage: string } | null
}

export function NavBar({
  activeTab,
  onTabChange,
  isReaderMode,
  onExitReader,
  summarizeProgress
}: NavBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <header className={`bg-paper border-b-4 border-ink sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}>
      {/* Top Edition Bar */}
      <div className={`border-b border-ink px-4 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-ink/60 transition-all duration-300 ${isScrolled ? 'py-0 h-0 overflow-hidden border-none' : 'py-1'}`}>
        <span>Vol. XXIV — No. 112</span>
        <div className="flex items-center gap-4">
          {summarizeProgress ? (
            <div className="flex items-center gap-3 text-editorial font-bold animate-pulse">
              <Loader size={10} className="animate-spin" />
              <span>{summarizeProgress.stage} ({Math.round(summarizeProgress.pct)}%)</span>
              <div className="w-24 h-1 bg-divider relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-editorial transition-all duration-500"
                  style={{ width: `${summarizeProgress.pct}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="hidden sm:inline">Statistical Inference Driven Research Intelligence</span>
          )}
        </div>
        <span>{today}</span>
      </div>

      <div className={`w-full px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-6'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex flex-col items-center transition-all duration-300 ${isScrolled ? 'gap-2' : 'gap-4'}`}>
            <div className="flex items-center justify-between w-full">
              {/* Left Spacer for centering */}
              <div className={`w-24 ${isReaderMode ? 'hidden' : 'block'} sm:block transition-all duration-300 ${isScrolled ? 'scale-75' : 'scale-100'}`}>
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
              <div className={`flex flex-col items-center group cursor-default transition-all duration-300 ${isScrolled ? 'scale-75 origin-top' : 'scale-100'}`}>
                <div className="flex items-center gap-3">
                  <Newspaper size={isScrolled ? 24 : 32} className="text-ink group-hover:text-editorial transition-colors" strokeWidth={1.5} />
                  <h1 className={`font-display font-black text-ink uppercase tracking-tighter text-center transition-all duration-300 ${isScrolled ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-7xl'}`}>
                    xresearcher
                  </h1>
                </div>
                <div className={`h-px w-full bg-ink transition-all duration-300 ${isScrolled ? 'mt-0.5' : 'mt-2'}`} />
                <div className="h-[2px] w-full bg-ink mt-0.5" />
                <p className={`font-mono uppercase tracking-[0.3em] text-ink/80 transition-all duration-300 ${isScrolled ? 'h-0 overflow-hidden mt-0 text-[0px]' : 'mt-2 text-[10px]'}`}>
                  All the Research That's Fit to Summarize
                </p>
              </div>

              {/* Right Menu Button (Mobile) */}
              <div className={`w-24 flex justify-end transition-all duration-300 ${isScrolled ? 'scale-75' : 'scale-100'}`}>
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
              <nav className={`flex items-center justify-center border-y border-ink w-full transition-all duration-300 gap-8 sm:gap-16 ${isScrolled ? 'py-1 mt-0' : 'py-2 mt-0'}`}>
                <button
                  onClick={() => onTabChange('inbox')}
                  className={`flex items-center gap-2 font-mono uppercase transition-colors hover:text-editorial ${
                    activeTab === 'inbox' ? 'text-editorial font-bold' : 'text-ink'
                  } ${isScrolled ? 'text-[10px]' : 'text-sm tracking-widest'}`}
                >
                  <Inbox size={isScrolled ? 12 : 16} strokeWidth={2} />
                  <span>Inbox</span>
                </button>
                <button
                  onClick={() => onTabChange('library')}
                  className={`flex items-center gap-2 font-mono uppercase transition-colors hover:text-editorial ${
                    activeTab === 'library' ? 'text-editorial font-bold' : 'text-ink'
                  } ${isScrolled ? 'text-[10px]' : 'text-sm tracking-widest'}`}
                >
                  <BookOpen size={isScrolled ? 12 : 16} strokeWidth={2} />
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

