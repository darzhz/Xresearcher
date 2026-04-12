export interface ModelConfig {
  repoId: string
  filename: string
  label: string
  sizeGB: number
  preferredBackend?: 'webgpu' | 'wasm'
}

export const MODELS: ModelConfig[] = [
  {
    repoId: 'onnx-community/Qwen2.5-1.5B-Instruct',
    filename: 'onnx', // Placeholder as transformers.js handles it
    label: 'Qwen 2.5 1.5B (Recommended)',
    sizeGB: 1.1,
    preferredBackend: 'webgpu'
  },
  {
    repoId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    filename: 'onnx',
    label: 'Qwen 2.5 0.5B (Fast)',
    sizeGB: 0.4,
    preferredBackend: 'webgpu'
  },
  {
    repoId: 'onnx-community/Phi-3-mini-4k-instruct-onnx',
    filename: 'onnx',
    label: 'Phi-3 Mini 4K (Better quality)',
    sizeGB: 2.2,
    preferredBackend: 'webgpu'
  },
  {
    repoId: 'onnx-community/SmolLM2-135M-Instruct',
    filename: 'onnx',
    label: 'SmolLM2 135M (Fastest)',
    sizeGB: 0.1,
    preferredBackend: 'webgpu'
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
