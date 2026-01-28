# HU! - Deployment Guide for YouTube Playables

## Build Summary

**Total Bundle Size:** 1.3 MB (uncompressed) / 348.37 KB (gzipped)
**Files:**
- `index.html`: 5.65 KB (1.96 KB gzipped)
- `assets/main.[hash].js`: 1,328.96 KB (348.37 KB gzipped)

**Status:** ✅ Well within YouTube Playables limits (typically 15-20 MB uncompressed)

---

## YouTube Playables Requirements

### ✅ Requirements Met

1. **Bundle Size:** 1.3 MB total (✅ Well under 15-20 MB limit)
2. **Single Bundle:** All code inlined into one JS file for optimal loading
3. **Mobile-First:** Portrait mode optimized (400-1600px width range)
4. **Touch Input:** Fully touch-compatible with no hover-dependent interactions
5. **Iframe Safe:** No external dependencies, all assets procedurally generated
6. **Loading Screen:** Professional loading screen with progress bar
7. **No External Assets:** 100% procedural generation (tiles, audio, particles)
8. **Portrait Orientation:** Optimized for mobile portrait mode with landscape warning

### Technical Details

- **Framework:** Phaser 3.90.0
- **Renderer:** WebGL with Canvas fallback
- **Audio:** Web Audio API (procedural synthesis)
- **Graphics:** Canvas 2D API (procedural tile generation)
- **Target:** ES2020
- **Minification:** Terser with console removal and 2-pass compression

---

## Build Instructions

### Prerequisites

```bash
# Node.js 18+ required
node --version  # Should be 18.x or higher
npm --version
```

### Development Build

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Run tests
npm test
```

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

**Build Output Location:** `dist/`

---

## Deployment Steps for YouTube Playables

### 1. Build the Game

```bash
npm run build
```

This generates:
- `dist/index.html` - Main entry point
- `dist/assets/main.[hash].js` - Bundled game code
- `dist/playable-manifest.json` - Metadata for YouTube

### 2. Verify Build Output

```bash
# Check total size
du -sh dist/

# List all files
find dist/ -type f -ls
```

Expected output:
```
1.3M    dist/
5.5K    dist/index.html
1.3M    dist/assets/main.[hash].js
```

### 3. Test Locally

```bash
# Preview the production build
npm run preview
```

Navigate to `http://localhost:4173` and verify:
- ✅ Loading screen appears and progresses
- ✅ Game loads and displays menu
- ✅ Touch/click interactions work
- ✅ Audio plays (after user interaction)
- ✅ No console errors in browser DevTools

### 4. Test in Iframe (Simulate YouTube Environment)

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>HU! - Iframe Test</title>
  <style>
    body { margin: 0; padding: 20px; background: #333; }
    iframe {
      width: 400px;
      height: 600px;
      border: 2px solid #666;
      background: white;
    }
  </style>
</head>
<body>
  <h1 style="color: white;">HU! - Iframe Test (YouTube Playables Simulation)</h1>
  <iframe src="http://localhost:4173" allowfullscreen></iframe>
</body>
</html>
```

Verify the game works correctly within the iframe.

### 5. Prepare for Upload

YouTube Playables typically requires:

1. **Main HTML file** (`index.html`) - Entry point
2. **Asset files** (`assets/` directory) - Bundled JavaScript
3. **Manifest** (`playable-manifest.json`) - Game metadata (optional, varies by platform)

**Upload Method 1: ZIP Archive**
```bash
cd dist/
zip -r ../hu-youtube-playables.zip .
cd ..
```

**Upload Method 2: Direct Directory**
Some platforms allow uploading the entire `dist/` directory.

### 6. YouTube Playables Submission

1. Go to [YouTube Playables Partner Portal](https://playables.youtube.com) (or equivalent)
2. Create a new game submission
3. Upload the `dist/` folder or ZIP archive
4. Fill in game metadata:
   - **Title:** HU! - Roguelike Mahjong Deck Builder
   - **Description:** A Balatro-inspired roguelike mahjong deck builder. Build your hand, score big, and collect powerful god tiles!
   - **Category:** Card / Strategy
   - **Tags:** mahjong, roguelike, deck-builder, card-game, strategy
   - **Orientation:** Portrait
5. Set preview image/icon (if required - you may need to create these assets)
6. Submit for review

---

## Build Configuration Details

### Vite Configuration (`vite.config.ts`)

Key optimizations applied:

```typescript
{
  base: './',                        // Relative paths for flexible hosting
  minify: 'terser',                  // Advanced minification
  sourcemap: false,                  // No source maps in production
  inlineDynamicImports: true,        // Single bundle file
  cssCodeSplit: false,               // Inline CSS
  terserOptions: {
    compress: {
      drop_console: true,            // Remove console.log
      drop_debugger: true,           // Remove debugger statements
      pure_funcs: ['console.log'],   // Remove specific functions
      passes: 2                      // Two compression passes
    }
  }
}
```

### HTML Configuration (`index.html`)

Mobile-optimized meta tags:

```html
<!-- Portrait mode, no zoom, no scroll -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<!-- Mobile web app -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- YouTube Playables -->
<meta name="playable-game" content="true">
<meta name="game-orientation" content="portrait">
```

---

## Asset Information

### No External Assets Required

This game uses **100% procedural generation**:

**Tiles (34 unique types):**
- Generated via Canvas 2D API in `TileTextureGenerator.ts`
- Chinese characters rendered with system fonts
- Gradients, borders, and styling all procedural
- Total: 136 tile instances (34 types × 4 copies)

**Audio (All sounds):**
- Synthesized with Web Audio API in `AudioManager.ts`
- Background music: Pentatonic loops
- Sound effects: Oscillator-based (sine, triangle, sawtooth waves)
- No audio files loaded

**Particles:**
- Simple circle textures generated in `BootScene.ts`
- Used for God Tile visual effects

**Result:** Zero external file dependencies = Fast loading + Small bundle size

---

## Performance Optimization

### Bundle Analysis

Current build statistics:

| Metric | Value | Status |
|--------|-------|--------|
| **Total Size (uncompressed)** | 1.3 MB | ✅ Excellent |
| **Total Size (gzipped)** | 348 KB | ✅ Excellent |
| **Main JS Bundle** | 1,328 KB | ✅ Good |
| **HTML** | 5.65 KB | ✅ Excellent |
| **Number of Files** | 2 | ✅ Minimal |
| **HTTP Requests** | 2 | ✅ Optimal |

### Load Time Estimates

| Connection | Expected Load Time |
|------------|-------------------|
| 4G (10 Mbps) | ~0.3 seconds |
| 3G (3 Mbps) | ~1 second |
| 2G (500 Kbps) | ~6 seconds |

### Further Optimization Ideas (Optional)

If you need to reduce bundle size further:

1. **Code Splitting by Scene:**
   ```typescript
   // Load scenes dynamically
   const MenuScene = await import('./scenes/MenuScene');
   ```

2. **Lazy Load Phaser:**
   ```typescript
   const Phaser = await import('phaser');
   ```

3. **Remove Unused Phaser Features:**
   Configure Phaser with only needed plugins in `main.ts`

4. **Font Subsetting:**
   Only include Chinese characters actually used in the game

Currently, the bundle size is excellent for YouTube Playables, so these optimizations are **not necessary**.

---

## Troubleshooting

### Build Issues

**Problem:** `terser not found`
```bash
npm install --save-dev terser
```

**Problem:** TypeScript errors during build
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Runtime Issues

**Problem:** Audio not playing on mobile
- **Cause:** Browser autoplay policies require user interaction
- **Solution:** Already implemented - audio context resumes after first user interaction in `BootScene.ts`

**Problem:** Game doesn't fit screen on mobile
- **Cause:** Viewport meta tags missing or incorrect
- **Solution:** Already implemented in `index.html` with proper viewport config

**Problem:** Touch interactions not working
- **Cause:** Hover-dependent interactions
- **Solution:** Verified - all interactions use `pointerdown` which works on touch

**Problem:** Loading screen stuck
- **Cause:** JavaScript error preventing game initialization
- **Solution:** Check browser console (F12) for errors

### Testing on Real Devices

**iOS Testing:**
1. Build the game: `npm run build`
2. Preview: `npm run preview`
3. Find your local IP: `ifconfig | grep inet`
4. Access from iPhone: `http://[YOUR-IP]:4173`

**Android Testing:**
1. Same as iOS
2. Or use Chrome DevTools Device Emulation (F12 → Toggle Device Toolbar)

---

## Version History

### v1.0.0 (Current)
- ✅ Initial YouTube Playables integration
- ✅ Optimized Vite build configuration
- ✅ Mobile viewport and meta tags
- ✅ Loading screen with progress bar
- ✅ Touch input verification
- ✅ Procedural asset generation (tiles, audio, particles)
- ✅ Portrait mode optimization
- ✅ Iframe compatibility
- ✅ Bundle size: 1.3 MB / 348 KB gzipped

---

## Support & Resources

### Documentation
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [Vite Documentation](https://vitejs.dev/)
- [YouTube Playables Guidelines](https://developers.google.com/youtube/playables) (if available)

### Project Structure
```
hu/
├── src/                    # Source code
│   ├── main.ts            # Game entry point
│   ├── scenes/            # Game scenes (Boot, Menu, Game, etc.)
│   ├── ui/                # UI components
│   ├── core/              # Game logic (tiles, scoring, etc.)
│   ├── roguelike/         # Roguelike mechanics
│   ├── audio/             # Audio manager (procedural)
│   └── data/              # Game data (fans, god tiles, etc.)
├── dist/                   # Build output (generated)
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies and scripts
├── playable-manifest.json # YouTube Playables metadata
└── DEPLOYMENT.md          # This file
```

### Contact
For issues or questions about deployment, refer to the project repository or maintainer.

---

**Last Updated:** 2026-01-28
**Build Tool Version:** Vite 7.3.1
**Game Version:** 1.0.0
