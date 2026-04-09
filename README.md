# xresearcher

A privacy-centric, local-first PWA that transforms arXiv papers into structured, audio-enabled research summaries using on-device AI.

## Features

- **Local-First**: All processing happens in your browser—no data sent to external servers
- **On-Device AI**: Uses WASM-based LLM (Qwen 2.5 1.5B) for fast, private inference
- **HTML-First**: Leverages ar5iv's semantic HTML rendering for robust paper parsing
- **Web Speech API**: Zero-dependency audio synthesis with system-native voices
- **Progressive Web App**: Works offline, installable on any device

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Platform** | PWA (Vite + Workbox) |
| **Paper Ingestion** | ar5iv (HTML) + DOMParser |
| **Storage** | OPFS (Origin Private File System) |
| **LLM Engine** | wllama (WASM) |
| **LLM Model** | Qwen 2.5 1.5B (GGUF) |
| **Voice** | Web Speech API |

## Development

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/      # React components
├── hooks/          # Custom hooks (useOPFS, useLLM)
├── workers/        # Web Workers (LLM inference)
├── types/          # TypeScript type definitions
└── lib/            # Utility functions
```

## Known Limitations

- **Coverage**: ar5iv covers ~85% of recent papers; older papers fall back to simple PDF viewing
- **Speed**: WASM inference is stable but slower (~5-8 tokens/sec) than GPU alternatives
- **Voice Quality**: System-native voices are functional but basic compared to advanced TTS models

## Roadmap

### Phase 1: Foundation ✅
- PWA infrastructure with offline support
- ar5iv paper ingestion and semantic parsing
- Basic UI with section browsing

### Phase 2: Intelligence (In Progress)
- wllama LLM integration for summarization
- Web Speech API audio synthesis
- Cross-section insight synthesis

### Phase 3: Polish
- Advanced filtering and search
- Saved summaries and bookmarking
- Model configuration UI

## License

MIT
