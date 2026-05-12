import { useState } from 'react'
import { X, Plus, Hash } from 'lucide-react'

const COMMON_CATEGORIES = [
  'cs.AI',
  'cs.LG',
  'cs.CV',
  'cs.NLP',
  'cs.CL',
  'stat.ML',
  'physics.data-an',
  'math.OC',
  'eess.SP',
  'q-bio.QM'
]

interface CategoryPickerProps {
  selectedCategories: string[]
  onAdd: (cat: string) => void
  onRemove: (cat: string) => void
  onClose: () => void
}

export function CategoryPicker({
  selectedCategories,
  onAdd,
  onRemove,
  onClose
}: CategoryPickerProps) {
  const [customCategory, setCustomCategory] = useState('')

  const handleAddCustom = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory)) {
      onAdd(customCategory.trim())
      setCustomCategory('')
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-4 border-ink max-w-2xl w-full shadow-[8px_8px_0px_0px_#111111] relative max-h-[90vh] flex flex-col">
        
        {/* FIXED HEADER */}
        <div className="p-8 pb-4 border-b-2 border-ink bg-paper z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">Topic Selection Ledger</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">Subscription Directory for Research Dispatches</p>
            </div>
            <button
              onClick={onClose}
              className="text-ink/40 hover:text-editorial transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 py-6 space-y-10">
          {/* Common categories */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-divider pb-2">Common Subject Classifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border-ink border-l border-t newsprint-grid">
              {COMMON_CATEGORIES.map(cat => (
                <label
                  key={cat}
                  className={`flex items-center p-4 cursor-pointer transition-colors ${
                    selectedCategories.includes(cat) ? 'bg-ink text-paper' : 'bg-paper hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onAdd(cat)
                      } else {
                        onRemove(cat)
                      }
                    }}
                    className="sr-only"
                  />
                  <Hash size={12} className={`mr-3 ${selectedCategories.includes(cat) ? 'text-editorial' : 'text-ink/20'}`} />
                  <span className="font-mono text-xs font-black uppercase tracking-tight">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom category input */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-divider pb-2">Custom Classification Entry</h3>
            <div className="flex gap-4 flex-col sm:flex-row">
              <input
                type="text"
                placeholder="e.g., cs.RO"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 px-4 py-3 border-b-2 border-ink bg-transparent font-mono text-sm focus:outline-none focus:bg-neutral-50 transition-colors"
              />
              <button
                onClick={handleAddCustom}
                className="group relative px-8 py-3 bg-ink text-paper hover:bg-editorial transition-colors"
              >
                <div className="flex items-center gap-2 relative z-10 font-mono text-[10px] uppercase font-black tracking-widest">
                  <Plus size={14} />
                  <span>Register Category</span>
                </div>
                <div className="absolute inset-0 border-2 border-ink translate-x-1 translate-y-1 -z-0" />
              </button>
            </div>
          </div>

          {/* Selected categories */}
          {selectedCategories.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-divider pb-2">Active Subscriptions ({selectedCategories.length})</h3>
              <div className="flex flex-wrap gap-3">
                {selectedCategories.map(cat => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink bg-neutral-50 font-mono text-[10px] uppercase font-black tracking-tight"
                  >
                    <Hash size={10} className="text-editorial" />
                    {cat}
                    <button
                      onClick={() => onRemove(cat)}
                      className="ml-1 text-ink/30 hover:text-editorial transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="p-8 pt-4 border-t-2 border-ink bg-paper flex justify-end z-10">
          <button
            onClick={onClose}
            className="group relative px-12 py-4 bg-ink text-paper hover:bg-editorial transition-colors"
          >
            <span className="relative z-10 font-mono text-[10px] uppercase font-black tracking-[0.2em]">Finalize Ledger</span>
            <div className="absolute inset-0 border-2 border-ink translate-x-1 translate-y-1 -z-0" />
          </button>
        </div>
      </div>
    </div>
  )
}