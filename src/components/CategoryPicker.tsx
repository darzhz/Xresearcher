import { useState } from 'react'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Select Interest Categories</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Common categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center">
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
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom category input */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Custom Category</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., cs.RO"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCustom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Selected categories */}
          {selectedCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Selected</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(cat => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                  >
                    {cat}
                    <button
                      onClick={() => onRemove(cat)}
                      className="hover:text-indigo-900"
                    >
                      ✕
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
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
