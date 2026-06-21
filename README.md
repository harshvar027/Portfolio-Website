# Portfolio Website

Open-source version of my personal portfolio — a scroll-driven, music-reactive site built with React, Three.js, and GSAP.

![Portfolio preview](https://github.com/user-attachments/assets/3c4557e7-6392-4928-b8a9-7b2476ef4edd)

---

## Features

- **3D character** — interactive avatar with lighting and animation
- **Scroll animations** — GSAP ScrollTrigger, ScrollSmoother, and SplitText
- **Tech stack showcase** — 3D floating sphere grid
- **Particle morph** — WebGL particles that morph into a profile image on scroll
- **Soundscape section** — music-reactive visuals tied to playback
- **Spotify integration** — search, play, and control tracks via the Web Playback SDK
- **Music notch** — Dynamic Island–style now-playing UI
- **Comments** — visitor feedback form (local dev via Vite middleware)

---

## Tech Stack

React · TypeScript · Vite · GSAP · Three.js · React Three Fiber · WebGL · CSS

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
git clone https://github.com/harshvar027/Portfolio-Website.git
cd Portfolio-Website
npm install
cp .env.example .env
npm run dev
```

Open **http://127.0.0.1:5173** (Spotify OAuth requires `127.0.0.1`, not `localhost`).

### Environment variables

| Variable | Description |
|---|---|
| `VITE_SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `VITE_SPOTIFY_REDIRECT_URI` | OAuth redirect URI (must match Spotify dashboard) |

Music features are optional — the site works without Spotify credentials.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## GSAP Plugins

This project uses **ScrollSmoother** and **SplitText**, which are GSAP Club plugins. You need a valid GSAP Club membership for production use.

See the official installation guide: https://gsap.com/docs/v3/Installation/

---

## Deployment

Configured for [Vercel](https://vercel.com) via `vercel.json` (SPA rewrites).

Set the Spotify environment variables in your Vercel project settings. Add your production URL as a redirect URI in the Spotify dashboard.

> **Note:** The comments API runs through a Vite dev middleware and does not persist comments in production. For production comment storage, add a serverless API route or external service.

---

## Assets

Some 3D assets in this repo are free to use for learning.

The original 3D avatar on the live portfolio is **not** included — it is a custom asset and not available for reuse. Do not extract or redistribute it from the live site.

---

## Usage Notice

This project is shared for **learning purposes only**.

Please do **not**:

- Clone or replicate the full website or design
- Repost it with minor content changes
- Use this project for commercial or client work
- Create tutorials using this exact project

If you use parts of the code, provide proper credit linking back to this repository.

Build your own version — don't just copy.

— Harshvardhan Singh

---

## License

Licensed under the Personal Portfolio License (PPL) v1.0. See [LICENSE](LICENSE) for details.
