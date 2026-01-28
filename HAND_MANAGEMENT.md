# Hand Management System

Complete Balatro-style hand management system for HU! (mahjong roguelike).

## Features

### Hand Class (`src/core/Hand.ts`)
- Holds up to 14 tiles
- Auto-sorts by suit and value when tiles are added
- Tracks draws remaining per round (like Balatro hands)
- Tracks discards remaining per round (like Balatro discards)
- Supports melds (chow, pong, kong)
- Validation for hand operations

**Key Methods:**
```typescript
// Drawing tiles
hand.drawTile(tile: Tile): boolean
hand.setDrawsRemaining(draws: number): void

// Discarding tiles
hand.discardTile(tile: Tile): boolean
hand.discardTiles(tiles: Tile[]): boolean
hand.setDiscardsRemaining(discards: number): void

// Round management
hand.resetRoundLimits(draws: number, discards: number): void

// State queries
hand.isFull: boolean
hand.drawsRemaining: number
hand.discardsRemaining: number
```

### HandDisplay Component (`src/ui/HandDisplay.ts`)
- Horizontal layout of TileSprite instances
- Multi-select support (tap multiple tiles)
- Mobile-first responsive scaling
- Auto-scales tiles to fit screen width
- Selected tiles use `TileState.Selected` (raised + glow effect)
- Smooth animations for drawing and discarding

**Configuration:**
```typescript
const handDisplay = new HandDisplay(scene, x, y, hand, {
  maxWidth: 800,              // Max width (auto-scales if exceeded)
  tileGap: 5,                 // Gap between tiles in pixels
  enableMultiSelect: true,    // Allow selecting multiple tiles
  enableAutoScale: true,      // Auto-scale to fit maxWidth
});
```

**Key Methods:**
```typescript
// Selection
handDisplay.selectTile(tile: Tile): void
handDisplay.deselectTile(tile: Tile): void
handDisplay.toggleTile(tile: Tile): void
handDisplay.deselectAll(): void
handDisplay.selectedTiles: Tile[]
handDisplay.selectedCount: number
handDisplay.hasSelection: boolean

// Actions
handDisplay.drawTile(tile: Tile): boolean
handDisplay.discardSelected(): boolean

// Visual feedback
handDisplay.highlightDiscardableTiles(color?: number): void
handDisplay.removeAllHighlights(): void
handDisplay.setAllTileStates(state: TileState): void

// Animations
handDisplay.animateTileAdd(tile: Tile): void
handDisplay.animateTileRemove(tiles: Tile | Tile[], callback?: () => void): void
handDisplay.animateInitialDeal(tiles: Tile[], delayBetween?: number): void

// Responsive
handDisplay.updateMaxWidth(maxWidth: number): void
handDisplay.getScaleFactor(): number
```

**Events:**
```typescript
// Listen for selection changes
handDisplay.on('selectionChanged', (tiles: Tile[]) => {
  console.log('Selected:', tiles);
});

// Listen for tile drawn
handDisplay.on('tileDrawn', (tile: Tile) => {
  console.log('Drew:', tile);
});

// Listen for tiles discarded
handDisplay.on('tilesDiscarded', (tiles: Tile[]) => {
  console.log('Discarded:', tiles);
});

// Listen for individual tile clicks
handDisplay.on('tileClicked', (tile: Tile, allSelected: Tile[]) => {
  console.log('Clicked:', tile);
});
```

### TileSprite States (`src/ui/TileSprite.ts`)
The hand system integrates with the new TileSprite state system:

- **FaceUp**: Normal display
- **FaceDown**: Show tile back
- **Selected**: Raised with golden glow (used for selected tiles)
- **Disabled**: Greyed out, non-interactive

### Mobile-First Design
The HandDisplay automatically scales tiles to fit the screen:

- Base tile size: 52×72 pixels (defined in TileTextureGenerator)
- Auto-scales down if 14 tiles exceed screen width
- Maintains aspect ratio and spacing
- Configurable max width for different screen sizes

**Example for different screen widths:**
```typescript
// Phone (375px width)
const handDisplay = new HandDisplay(scene, x, y, hand, {
  maxWidth: 375 - 40  // Leave 20px padding on each side
});
// Tiles will auto-scale to ~0.45x

// Tablet (768px width)
const handDisplay = new HandDisplay(scene, x, y, hand, {
  maxWidth: 768 - 80
});
// Tiles will display at full size

// Desktop (1920px width)
const handDisplay = new HandDisplay(scene, x, y, hand, {
  maxWidth: 1200  // Optional: cap max width on large screens
});
```

## Usage Example

See `src/scenes/HandDemoScene.ts` for a complete working example.

### Basic Setup

```typescript
import { Hand } from '../core/Hand';
import { HandDisplay } from '../ui/HandDisplay';
import { createFullTileSet, shuffleTiles, drawTiles } from '../core/Tile';
import { generateTileTextures } from '../ui/TileTextureGenerator';

class GameScene extends Phaser.Scene {
  private hand!: Hand;
  private handDisplay!: HandDisplay;
  private wall: Tile[] = [];

  preload() {
    // Generate tile textures (call once)
    generateTileTextures(this);
  }

  create() {
    // Create and shuffle wall
    const fullSet = createFullTileSet();
    this.wall = shuffleTiles(fullSet);

    // Create hand with round limits
    this.hand = new Hand();
    this.hand.resetRoundLimits(5, 3); // 5 draws, 3 discards

    // Create hand display
    this.handDisplay = new HandDisplay(
      this,
      this.scale.width / 2,
      this.scale.height - 150,
      this.hand,
      {
        maxWidth: this.scale.width - 40,
        enableMultiSelect: true,
      }
    );

    // Deal initial hand
    const { drawn, remaining } = drawTiles(this.wall, 13);
    this.wall = remaining;
    this.handDisplay.animateInitialDeal(drawn, 80);

    // Listen for events
    this.handDisplay.on('selectionChanged', (tiles) => {
      console.log(`${tiles.length} tiles selected`);
    });
  }
}
```

### Draw Action

```typescript
handleDraw() {
  if (this.hand.drawsRemaining <= 0) {
    console.log('No draws remaining!');
    return;
  }

  if (this.wall.length === 0) {
    console.log('Wall is empty!');
    return;
  }

  const { drawn, remaining } = drawTiles(this.wall, 1);
  this.wall = remaining;

  const success = this.handDisplay.drawTile(drawn[0]);
  if (success) {
    console.log('Drew:', drawn[0].displayName);
  }
}
```

### Discard Action

```typescript
handleDiscard() {
  if (!this.handDisplay.hasSelection) {
    console.log('Select tiles to discard!');
    return;
  }

  const success = this.handDisplay.discardSelected();
  if (success) {
    console.log('Discarded successfully');
  } else {
    console.log('No discards remaining!');
  }
}
```

### Responsive Resize

```typescript
resize(gameSize: { width: number; height: number }) {
  // Update hand display max width on resize
  this.handDisplay.updateMaxWidth(gameSize.width - 40);
}
```

## File Structure

```
src/
├── core/
│   ├── Hand.ts              # Hand data model with draw/discard limits
│   └── Tile.ts              # Tile data model and utilities
└── ui/
    ├── HandDisplay.ts        # Hand UI component (main controller)
    ├── TileSprite.ts         # Individual tile sprite with state support
    └── TileTextureGenerator.ts # Generates tile textures at boot
```

## Integration with Existing Systems

The hand management system is fully integrated with:

1. **TileTextureGenerator**: Uses pre-generated canvas textures for all tiles
2. **TileSprite**: Uses the new state system (FaceUp/FaceDown/Selected/Disabled)
3. **Tile utilities**: Auto-sorting, validation, and tile operations
4. **Phaser 3**: Container-based architecture for easy scene integration

## Testing the Demo

To see the hand management system in action, run the HandDemoScene:

```typescript
// In your main game config
const config = {
  // ... other config
  scene: [HandDemoScene]
};
```

The demo includes:
- 14-tile hand with auto-sort
- Multi-select by tapping tiles
- Draw button with remaining counter
- Discard button with remaining counter
- Mobile-responsive layout
- Visual feedback and animations

## Performance Notes

- Tile textures are generated once at boot (not per-tile)
- Uses object pooling via container management
- Efficient re-renders only when hand changes
- Smooth 60fps animations on mobile devices
- Auto-scaling prevents layout issues on small screens

## Future Enhancements

Potential additions:
- Drag-and-drop tile reordering
- Custom sort modes (by suit, by value, manual)
- Keyboard shortcuts for desktop
- Haptic feedback on mobile
- Sound effects for draw/discard
- Particle effects for discards
- Undo/redo support
