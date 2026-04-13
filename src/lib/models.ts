export interface ModelConfig {
  repoId: string
  filename: string
  label: string
  sizeGB: number
  preferredBackend?: 'webgpu' | 'wasm'
  dtype?: 'q4' | 'q8' | 'fp16' | 'fp32'
}

export const MODELS: ModelConfig[] = [
  {
    repoId: 'onnx-community/LFM2.5-350M-ONNX',
    filename: 'onnx',
    label: 'LFM2.5-350M-ONNX (Recommended)',
    sizeGB: 0.25,
    preferredBackend: 'webgpu',
    dtype: 'q4'
  },
  {
    repoId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    filename: 'onnx',
    label: 'Qwen 2.5 0.5B (Fast)',
    sizeGB: 0.4,
    preferredBackend: 'webgpu',
    dtype: 'q4'
  },
  {
    repoId: 'onnx-community/Phi-3-mini-4k-instruct-onnx',
    filename: 'onnx',
    label: 'Phi-3 Mini 4K (Better quality)',
    sizeGB: 2.3,
    preferredBackend: 'webgpu',
    dtype: 'q4'
  },
  {
    repoId: 'onnx-community/SmolLM2-135M-Instruct',
    filename: 'onnx',
    label: 'SmolLM2 135M (Fastest)',
    sizeGB: 0.1,
    preferredBackend: 'webgpu',
    dtype: 'q4'
  }
]

export const DEFAULT_MODEL = MODELS[0]

export function saveModelConfig(config: ModelConfig) {
  localStorage.setItem('xresearcher_model_config', JSON.stringify(config))
}

export function loadModelConfig(): ModelConfig {
  try {
    const saved = localStorage.getItem('xresearcher_model_config')
    return saved ? JSON.parse(saved) : DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}

export async function deleteModel(repoId: string) {
  if (!('indexedDB' in window)) return
  
  // Transformers.js uses 'transformers-cache' database
  const dbName = 'transformers-cache'
  try {
    const dbs = await window.indexedDB.databases()
    const exists = dbs.find(db => db.name === dbName)
    if (!exists) return

    // We can't easily delete specific files without internal knowledge of their schema
    // But we can delete the whole DB or suggest a clear
    // For now, we'll try to delete the DB to reclaim space if the user wants a full wipe
    // Or more precisely: transformers.js stores models as entries.
    // Simpler: Use Cache API if it exists (transformers.js v3 uses it)
    if ('caches' in window) {
      await caches.delete('transformers-cache')
    }
  } catch (e) {
    console.error('Failed to clear model cache:', e)
  }
}

export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usageGB: ((estimate.usage || 0) / (1024 ** 3)).toFixed(2),
      quotaGB: ((estimate.quota || 0) / (1024 ** 3)).toFixed(2)
    };
  }
  return null;
}
