# INSERT COIN 🕹️

A retro-themed web arcade where you can play classic retro games.

## Features

- Retro arcade-style interface
- Game selection screen
- Classic Snake game implementation
- Coming soon: More classic games like Tetris, Pac-Man, and Space Invaders

## Available Games

### Snake 🐍
The classic Snake game where you control a snake that grows as it eats food. Don't crash into the walls or yourself!
- Use arrow keys to control the snake
- Eat food to grow longer and increase your score
- Game over if you hit the walls or your own tail

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- CSS Modules - Component scoped styling
- HTML Canvas - For game rendering

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/clarriu97/insert-coin.git
   cd insert-coin
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```

3. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages.

#### Automatic Deployment

When you push changes to the `main` branch, GitHub Actions will automatically:
1. Build the project
2. Deploy it to GitHub Pages

You can view the deployed site at: https://clarriu97.github.io/insert-coin/

#### Manual Deployment

You can also deploy manually:

1. Build and export the project:
   ```
   npm run export
   ```

2. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run export` - Build the static site for deployment
- `npm run deploy` - Deploy to GitHub Pages

## Project Structure

```
insert-coin/
├─ public/          # Static assets
│  ├─ games/        # Game thumbnails
│  │  └─ snake.png  # Snake game thumbnail
│  ├─ sounds/       # Sound effects
│  └─ favicon.ico   # Website favicon
├─ src/
│  ├─ app/          # Next.js app directory
│  │  ├─ games/     # Game implementations
│  │  │  └─ snake/  # Snake game
│  │  ├─ globals.css    # Global styles
│  │  ├─ page.module.css # Page-specific styles
│  │  ├─ page.tsx       # Main page component
│  │  └─ layout.tsx     # Root layout
├─ .github/         # GitHub configuration
│  └─ workflows/    # GitHub Actions workflows
├─ package.json     # Project dependencies and scripts
├─ next.config.js   # Next.js configuration
├─ tsconfig.json    # TypeScript configuration
└─ .eslintrc.json   # ESLint configuration
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic arcade cabinets and retro gaming
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) 