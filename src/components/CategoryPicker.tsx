import { useState } from 'react'
import { X, Plus } from 'lucide-react'

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/80 via-blue-900/40 to-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Select Interest Categories
          </h2>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Common categories */}
          <div>
            <h3 className="text-sm font-semibold text-cyan-300 mb-3">Popular Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_CATEGORIES.map(cat => (
                <label
                  key={cat}
                  className="flex items-center p-3 bg-white/5 border border-cyan-500/20 rounded-lg hover:bg-white/10 hover:border-cyan-500/40 cursor-pointer transition-all duration-300"
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
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-cyan-100">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom category input */}
          <div>
            <h3 className="text-sm font-semibold text-cyan-300 mb-3">Custom Category</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., cs.RO"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 px-3 py-2 border border-cyan-500/30 bg-white/5 text-cyan-100 placeholder-cyan-300/50 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
              />
              <button
                onClick={handleAddCustom}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Selected categories */}
          {selectedCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Selected ({selectedCategories.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(cat => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 rounded-full text-sm hover:border-cyan-500/50 transition-all duration-300"
                  >
                    {cat}
                    <button
                      onClick={() => onRemove(cat)}
                      className="text-cyan-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
