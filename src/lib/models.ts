export interface ModelConfig {
  repoId: string
  filename: string
  label: string
  sizeGB: number
}

export const PRESET_MODELS: ModelConfig[] = [
   {
    repoId: 'LiquidAI/LFM2-350M-GGUF',
    filename: 'LFM2-350M-Q4_0.gguf',
    label: 'LFM2-350M-GGUF (Lightest)',
    sizeGB: 0.2
  },
  {
    repoId: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    label: 'Qwen 2.5 1.5B (Recommended)',
    sizeGB: 1.1
  },
  {
    repoId: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    label: 'Qwen 2.5 0.5B (Fast)',
    sizeGB: 0.4
  },
  {
    repoId: 'bartowski/Phi-3-mini-4k-instruct-GGUF',
    filename: 'Phi-3-mini-4k-instruct-Q4_K_M.gguf',
    label: 'Phi-3 Mini 4K (Better quality)',
    sizeGB: 2.2
  }
]

export const DEFAULT_MODEL = PRESET_MODELS[0]

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
