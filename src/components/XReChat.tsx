import React, { useState, useRef, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useXReChat } from '../hooks/useXReChat'

interface XReChatProps {
  paperId: string
  initialized: boolean
}

export function XReChat({ paperId, initialized }: XReChatProps) {
  const { messages, loading, readingSections, askQuestion, clearChat } = useXReChat(paperId)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !initialized) return
    askQuestion(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px] border-4 border-ink bg-paper hard-shadow-editorial mt-4 sm:mt-8 overflow-hidden mx-[-1rem] sm:mx-0">
      {/* Header */}
      <div className="border-b-4 border-ink p-3 sm:p-4 bg-ink text-paper flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-editorial animate-pulse" />
          <h3 className="font-mono uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-xs font-bold truncate max-w-[150px] sm:max-w-none">XReChat Local Inference</h3>
        </div>
        <button 
          onClick={clearChat}
          className="font-mono text-[9px] sm:text-[10px] uppercase underline decoration-editorial hover:text-editorial transition-colors shrink-0"
        >
          Reset Logs
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 newsprint-texture"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-6 sm:px-10">
            <div className="mb-2 sm:mb-4 text-3xl sm:text-4xl">⌨️</div>
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest leading-relaxed">
              Query the document via XReChat traversal.<br className="hidden sm:block"/>
              Local SLM read sections to extract facts.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
               <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-ink/40">
                {msg.role === 'user' ? 'Researcher' : 'XReChat-1.5B'}
               </span>
               {msg.metrics && (
                 <span className="font-mono text-[8px] sm:text-[9px] text-editorial/60 flex items-center gap-1 uppercase">
                   <Zap size={8} /> {msg.metrics.tokPerSec.toFixed(1)} tok/s
                 </span>
               )}
            </div>
            <div 
              className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 border-2 border-ink ${
                msg.role === 'user' 
                  ? 'bg-ink text-paper' 
                  : 'bg-paper text-ink'
              } font-body leading-relaxed text-xs sm:text-sm break-words`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1">
               <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-ink/40 animate-pulse">
                XReChat is processing...
               </span>
            </div>
            <div className="max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 border-2 border-ink border-dashed bg-paper/50 flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-ink border-t-editorial animate-spin" />
                <p className="font-mono text-[9px] sm:text-[10px] italic">Traversing index...</p>
              </div>
              {readingSections.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {readingSections.map((s, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-editorial text-paper text-[8px] sm:text-[9px] font-mono truncate max-w-full">
                      [{s}]
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSubmit}
        className="border-t-4 border-ink p-3 sm:p-4 bg-paper/50"
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !initialized}
            placeholder={initialized ? "Inquire within publication..." : "Engine offline..."}
            className="flex-1 bg-transparent border-2 border-ink p-2 sm:p-3 font-mono text-xs sm:text-sm focus:outline-none focus:border-editorial placeholder:text-ink/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !initialized}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-ink text-paper font-mono uppercase tracking-widest text-[10px] sm:text-xs font-bold hover:bg-editorial disabled:opacity-30 transition-all active:translate-x-[1px] active:translate-y-[1px] sm:active:translate-x-[2px] sm:active:translate-y-[2px]"
          >
            Traverse
          </button>
        </div>
      </form>
    </div>
  )
}
