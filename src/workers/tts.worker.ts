/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js'
import { env } from '@huggingface/transformers'
import { OPFSCache } from '../lib/opfs-cache'

interface MessageData {
  type: 'init' | 'generate' | 'dispose' | 'disposed' | 'status' | 'result' | 'error'
  text?: string
  voice?: string
  speed?: number
  device?: 'webgpu' | 'wasm'
  dtype?: 'fp32' | 'q8'
  message?: string
  audio?: Float32Array
  sampling_rate?: number
  error?: string
}

let tts: any = null

self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, voice, speed, device, dtype } = event.data

  try {
    if (type === 'init') {
      if (tts) {
        self.postMessage({ type: 'init-complete' })
        return
      }
      
      self.postMessage({ type: 'status', message: `Initializing OPFS Model Cache…` })
      
      // Configure transformers.js to use OPFS for caching
      try {
        const opfsCache = await OPFSCache.open('tts-cache')
        env.useBrowserCache = false
        env.useCustomCache = true
        env.customCache = opfsCache as any
      } catch (e) {
        console.warn('[TTS Worker] Failed to initialize OPFS cache, falling back to default:', e)
      }
      
      self.postMessage({ type: 'status', message: `Loading Kokoro-82M (${device?.toUpperCase()})...` })
      
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        device,
        dtype,
      })
      
      self.postMessage({ type: 'init-complete' })
    } else if (type === 'generate') {
      if (!tts) throw new Error('TTS not initialized')
      
      const out = await tts.generate(text, { voice, speed })
      
      // out.audio is usually a Float32Array
      const audio = out.audio instanceof Float32Array ? out.audio : new Float32Array(out.audio)
      
      self.postMessage({ 
        type: 'result', 
        audio, 
        sampling_rate: out.sampling_rate || 24000 
      }, [audio.buffer] as any)
    } else if (type === 'dispose') {
      if (tts) {
        // Reach into the transformers.js PreTrainedModel and release ONNX sessions
        try {
          await tts.model?.dispose?.()
        } catch (e) {
          console.warn('[TTS Worker] dispose error:', e)
        }
        tts = null
      }
      // Terminate the worker entirely — nothing else to keep alive
      self.postMessage({ type: 'disposed' })
      self.close()
    }
  } catch (err: any) {
    self.postMessage({ 
      type: 'error', 
      error: err?.message || String(err) 
    })
  }
}
