# INSERT COIN 🕹️

A retro-themed web arcade where you can play classic retro games.

> **Note**: This project has been entirely developed by AI under the direction of clarriu97. Every line of code, from the retro-styled interface to the game implementations, has been crafted through AI assistance while maintaining high quality and best practices.

[![Deployment Status](https://github.com/clarriu97/insert-coin/actions/workflows/deploy.yml/badge.svg)](https://github.com/clarriu97/insert-coin/actions/workflows/deploy.yml)
[![Play Now!](https://img.shields.io/badge/Play%20Now!-GitHub%20Pages-success?logo=github)](https://clarriu97.github.io/insert-coin/)
[![Made with AI](https://img.shields.io/badge/Made%20with-AI-blueviolet?logo=openai)](https://github.com/clarriu97/insert-coin)
[![Powered by Coffee](https://img.shields.io/badge/Powered%20by-☕%20Coffee-brown)](https://github.com/clarriu97/insert-coin)
[![Retro Level](https://img.shields.io/badge/Retro%20Level-Over%209000!-orange)](https://github.com/clarriu97/insert-coin)

## 🎮 Available Games

### 🐍 Snake
- Classic snake gameplay
- Retro neon aesthetics
- Score tracking
- Increasing difficulty

### 🟦 Tetris
- Classic Tetris mechanics
- Neon-colored pieces
- Score and level system
- Next piece preview
- Pause functionality

## 🚀 Features

- Retro arcade cabinet interface
- Neon aesthetic design
- Responsive controls
- Score tracking system
- Game state management
- Mobile-friendly layout

## 🛠️ Tech Stack

- React + React Router
- Vite
- HTML5 Canvas
- CSS3 with custom properties
- Responsive Design
- GitHub Pages for deployment
- GitHub Actions for CI/CD

## 🎯 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/clarriu97/insert-coin.git
   cd insert-coin
   ```

2. Install dependencies and run in development:
   ```bash
   pnpm install
   pnpm dev
   ```

3. Start playing! 🎮

## 🎨 Project Structure

```
insert-coin/
├─ src/
│  ├─ main.jsx        # React entry
│  ├─ App.jsx         # Router setup
│  ├─ views/          # Main app views
│  └─ styles.css      # Global styles
├─ public/legacy/     # Legacy Snake/Tetris pages
└─ public/            # Static assets
```

## 🔄 Development

CI/CD (`.github/workflows/deploy.yml`) runs on every push to `main` or `master`:

1. `pnpm install --frozen-lockfile`
2. `pnpm run lint`
3. `pnpm run build` with `VITE_BASE_PATH` set to `/<repository-name>/` (correct asset URLs on GitHub Pages)

For **this** repository (`clarriu97/insert-coin`), GitHub sets that to **`/insert-coin/`**, which matches the live site:

**https://clarriu97.github.io/insert-coin/**

Routing uses hash URLs (`/#/`, `/#/snake`, `/#/tetris`) so refreshes work on static hosting.

The built site is uploaded from the `dist/` folder via **GitHub Actions** Pages deployment.

**Repository settings:** In GitHub → *Settings* → *Pages*, set **Source** to **GitHub Actions** (not “Deploy from a branch”). The first run may require approving the `github-pages` environment if your org uses deployment protection.

**Local production build check** (same as CI for this repo):

```bash
VITE_BASE_PATH=/insert-coin/ pnpm run build
```

## 🎯 Upcoming Features

- [ ] More classic games
- [ ] High score system
- [ ] Sound effects
- [ ] Mobile touch controls
- [ ] Multiplayer modes

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic arcade cabinets
- Font: [Press Start 2P](https://fonts.googleapis.com/css2?family=Press+Start+2P) 