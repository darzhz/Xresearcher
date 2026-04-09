This is a brilliant architectural pivot. You’ve successfully identified the "complexity traps" that turn a weekend project into a multi-month struggle. By shifting from heavy native shims and experimental GPU runtimes to stable WASM and standardized Web APIs, you’re moving from **fighting the platform** to **using the platform.**

Here is the structured Project Manifest for your **Local-First Research Summarizer**, optimized for a 48-hour sprint.

---

# 🚀 Project: ArXiv Local-Voice (ALV)
**Concept:** A privacy-centric, local-first PWA that transforms arXiv papers into structured, audio-enabled research summaries using on-device AI.

## 🛠 Optimized Tech Stack
| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Platform** | **PWA (Vite + Workbox)** | Eliminates Android Studio/TWA overhead; instant deployment via Cloudflare/GitHub. |
| **Ingestion** | **ar5iv (HTML) + DOMParser** | Replaces complex PDF parsing with semantic `<section>` and `<math>` tags. |
| **Storage** | **OPFS (Origin Private File System)** | High-performance local storage for models and paper indices. |
| **LLM Engine** | **wllama (WASM)** | Predictable memory footprint (~900MB); works reliably on mid-range Android. |
| **LLM Model** | **Qwen 2.5 1.5B (GGUF)** | Balanced reasoning-to-size ratio for summarized insights. |
| **Voice/Audio** | **Web Speech API** | Zero-latency, zero-dependency streaming; uses system-native Google TTS. |

---

## 🏗 System Architecture

### 1. The Data Pipeline (HTML-First)
Instead of fighting `pdf.js` layout heuristics, the app prioritizes the **ar5iv** mirror.
* **Primary:** `https://ar5iv.org/html/{id}` -> Extract sections via `querySelectorAll('section')`.
* **Fallback:** Standard PDF view (for papers not yet converted).

### 2. The Inference Worker (Stable Local AI)
Running the LLM in a dedicated Web Worker via `wllama` ensures the UI remains responsive.



```javascript
// Worker logic: Simple, stable, CPU-bound
import { Wllama } from '@wllama/wllama';

const wllama = new Wllama('/wllama/esm/');
// Load 4-bit quantized model into OPFS for persistence
await wllama.loadModelFromUrl(MODEL_URL, { n_ctx: 2048 }); 
```

### 3. Voice Orchestration
The app uses a "Chunk-and-Speak" strategy. As the LLM streams text, the app identifies sentence boundaries and queues them to the browser's `speechSynthesis`.

---

## 📅 The Sprint Roadmap

### **Phase 1: The Foundation (Data & Storage)**
* **AM: PWA Infrastructure**
    * Setup Vite + `vite-plugin-pwa`.
    * Configure Service Worker for offline asset caching.
    * Initialize OPFS for model and document storage.
* **PM: Semantic Ingestion**
    * Implement the `fetchAr5iv` logic.
    * Build the `PageIndex` (mapping section IDs to content).
    * Create a basic UI to display the "Paper Outline."

### **Phase 2: The Intelligence (AI & Voice)**
* **AM: LLM Integration**
    * Integrate `wllama` worker.
    * Implement the "Two-Phase Router":
        1.  *Phase 1:* Summarize specific sections.
        2.  *Phase 2:* Synthesize cross-section insights.
* **PM: Audio & Polish**
    * Connect LLM stream to `SpeechSynthesis`.
    * Add "Listen" toggles to paper sections.
    * Final UI cleanup (Tailwind CSS).
* **Evening: Deployment**
    * Deploy to Cloudflare Pages.
    * Run through **PWABuilder** to generate a `.apk` for Android testing.

---

## ⚠️ Known Trade-offs
* **Inference Speed:** By choosing WASM over WebGPU, you trade raw tokens-per-second (~5-8 t/s) for **stability**. Since this is a "Podcast" style reader, the user is listening, not waiting for a chat bubble.
* **Coverage:** ar5iv covers ~85% of recent papers. For the remaining 15%, the app will revert to a simple PDF viewer without advanced summarization.
* **Voice Quality:** System-native voices are "robotic" compared to ONNX models, but they require **0MB** of extra download and **0%** extra CPU overhead.

---

> **Pro-Tip:** Focus on the "Happy Path" first—an ar5iv paper being summarized and read aloud. Keep the UI minimal (Reader Mode) and only layer back in complex PDF parsing if you find yourself using the app daily.
