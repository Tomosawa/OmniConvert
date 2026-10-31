# OmniConvert

> A local-first all-in-one file converter — images, audio/video and documents are converted entirely on your device. **Your files are never uploaded.**

[中文](README.md) | **English**

[![Status](https://img.shields.io/badge/status-v0.1.0-brightgreen)](https://github.com/tomosawa/OmniConvert/releases) [![Vue](https://img.shields.io/badge/Vue-3-42b883)]() [![Nuxt](https://img.shields.io/badge/Nuxt-3.16-00DC82)]() [![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB)]() [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)]() [![License](https://img.shields.io/badge/license-MIT-green)]()

## Overview

OmniConvert does one thing: **convert your local files securely, for free, and across every major format.**

- Privacy first: all conversions run locally in the browser or desktop app; files never leave your device
- Three engines: [ImageMagick](https://imagemagick.org) (images), [FFmpeg](https://ffmpeg.org) (audio/video), [Pandoc](https://pandoc.org) (documents)
- Everywhere: Web version plus Windows / macOS / Linux desktop apps (Tauri 2.0)
- Modern experience: light/dark themes, 11 languages, batch queue, history, ZIP download

Full requirements: [docs/prd/OmniConv-prd.md](docs/prd/OmniConv-prd.md).

## Download

Desktop installers are published on [GitHub Releases](https://github.com/tomosawa/OmniConvert/releases):

- macOS (Apple Silicon): `OmniConvert_0.1.0_aarch64.dmg`
- Windows (x64): `OmniConvert_0.1.0_x64-setup.exe` (NSIS installer), `OmniConvert_0.1.0_x64_en-US.msi` (MSI installer)
- Linux builds must be produced on their respective platforms — see "Desktop Development" below

The web version ships as a static bundle, `OmniConvert_0.1.0_web.zip`, or can be run as a Docker image.

### Web release (dist packaging)

```bash
pnpm generate        # Generate static (SSG) output into .output/public
# Package the release zip (PowerShell)
Compress-Archive -Path .output/public/* -DestinationPath OmniConvert_0.1.0_web.zip
```

## Status

**v0.1.0 — Web MVP + macOS & Windows desktop released**

The complete 10-phase plan is in [docs/plan/00-overview.md](docs/plan/00-overview.md):

| Phase | Topic | Status |
| :--- | :--- | :--- |
| 0 | Project scaffolding | ✅ Done |
| 1 | UI + i18n + themes | ✅ Done |
| 2 | File upload & format detection | ✅ Done |
| 3 | ImageMagick image engine | ✅ Done |
| 4 | FFmpeg audio/video engine | ✅ Done |
| 5 | Pandoc document engine | ✅ Done |
| 6 | Batch queue + history + ZIP (MVP) | ✅ Done |
| 7 | i18n for 9 additional languages | ✅ Done |
| 8 | Tauri desktop app | ✅ Done (v0.1.0) |
| 9 | Deployment, CI/CD | Not started |

## Tech Stack

- **Framework**: Nuxt 3 + Vue 3 Composition API + TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn-vue
- **State**: Pinia
- **i18n**: @nuxtjs/i18n
- **Themes**: @nuxtjs/color-mode
- **Testing**: Vitest + @vue/test-utils + happy-dom
- **Lint**: ESLint (@nuxt/eslint flat config) + Prettier
- **Desktop**: Tauri 2.0 + native CLI sidecars
- **Deployment**: Vercel (web) + GitHub Releases (desktop)

## Quick Start

Requirements: Node ≥ 20.11, pnpm ≥ 10.

```bash
pnpm install        # Install dependencies
pnpm dev            # Start the web dev server at http://localhost:3000
pnpm generate       # Generate static (SSG) output (required for desktop builds)
pnpm test           # Run Vitest unit tests
pnpm typecheck      # Run vue-tsc type checking
pnpm lint           # Run ESLint
pnpm build          # Build production output into .output/
pnpm preview        # Preview the build output
pnpm format         # Format the whole repo with Prettier
```

## Desktop Development (Tauri)

Requirements: Rust ≥ 1.70, Tauri CLI ≥ 2.0 (`pnpm add -D @tauri-apps/cli`).

### Dev mode

```bash
pnpm tauri:dev      # Launch desktop dev mode (Tauri starts the Nuxt dev server + native window)
```

> In dev mode Tauri automatically runs `pnpm dev` to start the Nuxt dev server (`http://localhost:3000`) and loads it in a native window. Hot reload is supported.

### Release build

```bash
pnpm generate       # Generate static (SSG) output first
pnpm tauri:build    # Build desktop installers (.dmg / .app / .exe / .deb)
```

> Before building, Tauri runs `pnpm generate` to produce the static pages, then bundles them into a platform installer. Artifacts are placed under `src-tauri/target/release/bundle/`.

### Sidecar binaries

The desktop app uses native CLI tools (ImageMagick / FFmpeg / Pandoc) as sidecars, stored under `src-tauri/binaries/`. Make sure the binaries exist before your first dev run or build:

```bash
pnpm tauri:prepare-binaries   # Detect the platform and copy system-installed CLIs into src-tauri/binaries/
```

You can also download the binaries manually and place them in `src-tauri/binaries/`; file names must match the Tauri platform triple:

- macOS ARM64: `ffmpeg-aarch64-apple-darwin`, `magick-aarch64-apple-darwin`, `pandoc-aarch64-apple-darwin`
- macOS Intel: `ffmpeg-x86_64-apple-darwin`, `magick-x86_64-apple-darwin`, `pandoc-x86_64-apple-darwin`
- Windows: `ffmpeg-x86_64-pc-windows-msvc.exe`, etc.
- Linux: `ffmpeg-x86_64-unknown-linux-gnu`, etc.

### Architecture

| Environment | Engine | Path |
| :--- | :--- | :--- |
| Web | WASM (in browser) | `composables/use*Conversion.ts` |
| Desktop | Sidecar (native CLI) | `composables/useDesktop*Conversion.ts` |

`useConversionDispatcher` automatically picks the right path — it detects `window.__TAURI_INTERNALS__` and uses sidecars on desktop while falling back to WASM on the web.

## Project Structure

```
OmniConvert/
├── app.vue                # Root component
├── nuxt.config.ts         # Nuxt config
├── tailwind.config.ts     # Tailwind
├── tsconfig.json          # TypeScript strict
├── vitest.config.ts       # Vitest
├── eslint.config.mjs      # Flat config
├── assets/css/            # Global styles
├── pages/                 # Route pages
├── layouts/               # Layouts
├── components/            # PascalCase components
├── composables/           # camelCase use*.ts
├── stores/                # Pinia
├── types/                 # PascalCase types
├── workers/               # WASM Web Workers
├── utils/                 # Pure functions
├── docker/                # Docker deployment files
│   ├── Dockerfile         # Multi-stage build (x86/nginx)
│   └── nginx.conf         # Nginx config (with COOP/COEP)
├── locales/               # i18n resources
├── tests/                 # Vitest unit tests
└── docs/
    ├── prd/               # Product requirements
    └── plan/              # Phased development plan
```

See [CLAUDE.md](CLAUDE.md) for development conventions and naming rules.

## Docker Deployment

### Build the image (x86 architecture)

Run from the project root:

```bash
docker build -f docker/Dockerfile --platform linux/amd64 -t omniconvert:latest .
```

### Export the image as a tar file

```bash
docker save omniconvert:latest -o docker/omniconvert.tar
```

> Image tar files are large and are ignored by `.gitignore`, so they are not committed to the repository.

### Upload to an Ubuntu server

```bash
scp omniconvert.tar user@your-server:/path/to/deploy/
```

### Load and run on the server

```bash
docker load -i omniconvert.tar
docker run -d -p 5000:5000 --name omniconvert --restart unless-stopped omniconvert:latest
```

Then open `http://your-server:5000`.

### Common operations

```bash
docker stop omniconvert          # Stop
docker start omniconvert         # Start
docker rm omniconvert            # Remove the container
docker logs omniconvert          # View logs
docker ps                        # Show running containers
curl http://localhost:5000/health  # Health check
```

## Contributing

Issues and pull requests are welcome.

## License

MIT
