# GEMINI.md - ArXiv Local-Voice (ALV) / xresearcher

## 🚀 Project Overview
A privacy-centric, local-first Progressive Web App (PWA) that transforms arXiv research papers into structured, audio-enabled summaries using on-device AI.

## 🏗 System Architecture & Core Principles
- **Local-First & Privacy-Centric:** All processing (inference, storage, synthesis) happens on the user's device. No telemetry or server-side data extraction.
- **HTML-First (ar5iv):** Prioritizes the **ar5iv** (HTML) mirror for semantic ingestion over traditional PDF parsing.
- **On-Device LLM:** Uses **transformers.js (WebGPU/WASM)** with **Qwen 2.5 1.5B (ONNX)** for stable, privacy-preserving summarization.
- **Persistence (IndexedDB):** Models are cached in **IndexedDB** for high-performance access. Metadata is managed via **Dexie (IndexedDB)**.
- **Voice Synthesis:** Leverages the **Web Speech API** for zero-latency, zero-dependency audio streaming.

## 🛠 Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Framework** | React 18 (TypeScript) + Vite |
| **Styling** | Tailwind CSS (Newsprint aesthetic) |
| Inference | transformers.js (WebGPU/WASM) / Qwen 2.5 1.5B |
| Storage | IndexedDB (Models) + Dexie/IndexedDB (Metadata) |

| **Networking** | Fetch + CORS Proxy (AllOrigins) |
| **Offline** | Service Workers (Vite PWA / Workbox) |

## 🏗 Project Structure
- `src/components/`: Modular UI components (NavBar, PaperCard, etc.).
- `src/hooks/`: Custom React hooks for domain-specific logic (`useLLM`, `useOPFS`, `useLibrary`).
- `src/lib/`: Core logic and utilities (LLM engine, paper storage, ar5iv fetching).
- `src/types/`: Centralized TypeScript interface definitions.
- `src/workers/`: Web Workers for background tasks (e.g., `llm.worker.ts`).

## 🛠 Critical Commands
| Command | Action |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production (tsc + vite build) |
| `npm run preview` | Preview production build locally |

## 🧩 Coding Standards & Conventions
- **Component Pattern:** Functional components with standard React Hooks. Prefer splitting complex UI into smaller, reusable components in `src/components`.
- **Logic Separation:** Keep domain logic (storage, LLM, API) in `src/lib/` or custom hooks in `src/hooks/`.
- **TypeScript:** Strict typing is expected. Define shared types in `src/types/index.ts`.
- **Styling:** Use Tailwind CSS. Follow the "newsprint" aesthetic (monochrome, high contrast, hard shadows, paper textures).
- **Naming:**
    - Components: PascalCase (e.g., `PaperCard.tsx`)
    - Hooks: `use` prefix, camelCase (e.g., `useOPFS.ts`)
    - Utilities/Logic: camelCase (e.g., `paperStorage.ts`)
- **Web Workers:** Use ES modules for workers (configured in `vite.config.ts`).
- **Data Integrity:** Always validate and sanitize inputs from external APIs (arXiv/ar5iv).

## ⚠️ Known Constraints
- **Inference Footprint:** Qwen 2.5 1.5B requires ~900MB of RAM.
- **ar5iv Coverage:** Covers ~85% of recent papers. Fallbacks should handle PDF-only papers gracefully.
- **WASM Performance:** Optimized for stability on mid-range devices (~5-8 tokens/sec).
