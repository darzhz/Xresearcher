/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js'

let tts: any = null

self.onmessage = async (event: MessageEvent) => {
  const { type, text, voice, speed, device, dtype } = event.data

  try {
    if (type === 'init') {
      if (tts) {
        self.postMessage({ type: 'init-complete' })
        return
      }
      
      self.postMessage({ type: 'status', message: `Loading Kokoro-82M (${device.toUpperCase()})...` })
      
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
    }
  } catch (err: any) {
    self.postMessage({ 
      type: 'error', 
      error: err?.message || String(err) 
    })
  }
}
