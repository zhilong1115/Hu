import Phaser from 'phaser';
import { TileSuit, WindValue, DragonValue } from '../core/Tile';

/**
 * Tile dimensions — mobile-first, responsive to canvas size.
 * Base design at 800×600; scale factor applied at render time.
 */
export const TILE_W = 72;
export const TILE_H = 100;
const CORNER_R = 6;

/* ── colour palette ─────────────────────────────────────── */
const COLORS = {
  // Suit accent colours (for characters / indicators)
  wan: 0xc0392b,   // red
  tiao: 0x27ae60,  // green
  tong: 0x2980b9,  // blue
  wind: 0x2c3e50,  // dark grey-blue
  dragon_red: 0xcc0000,
  dragon_green: 0x1b8c3a,
  dragon_white: 0x4a6fa5,

  // Tile surface
  tileFace: 0xf5f0e8,       // warm ivory
  tileFaceEdge: 0xd4cfc4,   // subtle edge tone
  tileBorder: 0x8e8a82,     // border
  tileShadow: 0x6b6560,

  // Tile back
  tileBack: 0x1a6b3c,       // classic green
  tileBackDark: 0x145530,
  tileBackPattern: 0x228b4a,
  tileBackBorder: 0x0f4025,
};

/**
 * Generates all tile textures into the Phaser texture manager.
 * Call once in BootScene.preload() or create().
 *
 * Texture keys:
 *   face:<suit>-<value>   e.g. "face:wan-1", "face:wind-1", "face:dragon-1"
 *   tile-back
 */
export function generateTileTextures(scene: Phaser.Scene): void {
  // If SVG assets were loaded in BootScene preload(), skip programmatic generation.
  // Check for a representative key to detect SVG loading.
  if (scene.textures.exists('face:wan-1') && scene.textures.exists('tile-back')) {
    console.log('[TileTextureGenerator] SVG tile textures detected, skipping programmatic generation');
    return;
  }

  console.log('[TileTextureGenerator] No SVG tiles found, generating programmatic textures');

  // ── Number suits ──
  for (let v = 1; v <= 9; v++) {
    generateFaceTexture(scene, TileSuit.Wan, v, getWanChar(v), COLORS.wan);
    generateFaceTexture(scene, TileSuit.Tiao, v, getTiaoChar(v), COLORS.tiao);
    generateFaceTexture(scene, TileSuit.Tong, v, getTongChar(v), COLORS.tong);
  }

  // ── Winds ──
  const windChars: Record<number, string> = {
    [WindValue.East]: '东',
    [WindValue.South]: '南',
    [WindValue.West]: '西',
    [WindValue.North]: '北',
  };
  for (const wv of [WindValue.East, WindValue.South, WindValue.West, WindValue.North]) {
    generateFaceTexture(scene, TileSuit.Wind, wv, windChars[wv], COLORS.wind);
  }

  // ── Dragons ──
  const dragonColors: Record<number, number> = {
    [DragonValue.Red]: COLORS.dragon_red,
    [DragonValue.Green]: COLORS.dragon_green,
    [DragonValue.White]: COLORS.dragon_white,
  };
  const dragonChars: Record<number, string> = {
    [DragonValue.Red]: '中',
    [DragonValue.Green]: '发',
    [DragonValue.White]: '白',
  };
  for (const dv of [DragonValue.Red, DragonValue.Green, DragonValue.White]) {
    generateFaceTexture(scene, TileSuit.Dragon, dv, dragonChars[dv], dragonColors[dv]);
  }

  // ── Tile back ──
  generateBackTexture(scene);
}

/* ── helpers: Chinese number chars ──────────────────────── */
function getWanChar(v: number): string {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return nums[v] + '万';
}

function getTiaoChar(v: number): string {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return nums[v] + '条';
}

function getTongChar(v: number): string {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return nums[v] + '筒';
}

/* ── suit label for small indicator at bottom ────────────── */
function getSuitLabel(suit: TileSuit): string {
  switch (suit) {
    case TileSuit.Wan: return '万';
    case TileSuit.Tiao: return '条';
    case TileSuit.Tong: return '筒';
    case TileSuit.Wind: return '风';
    case TileSuit.Dragon: return '龙';
  }
}

/* ══════════════════════════════════════════════════════════
   FACE TEXTURE
   ══════════════════════════════════════════════════════════ */
function generateFaceTexture(
  scene: Phaser.Scene,
  suit: TileSuit,
  value: number,
  mainChar: string,
  accentColor: number,
): void {
  const key = `face:${suit}-${value}`;
  const w = TILE_W;
  const h = TILE_H;
  const r = CORNER_R;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // ── rounded rect helper ──
  const roundRect = (
    x: number, y: number, rw: number, rh: number, radius: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + rw - radius, y);
    ctx.quadraticCurveTo(x + rw, y, x + rw, y + radius);
    ctx.lineTo(x + rw, y + rh - radius);
    ctx.quadraticCurveTo(x + rw, y + rh, x + rw - radius, y + rh);
    ctx.lineTo(x + radius, y + rh);
    ctx.quadraticCurveTo(x, y + rh, x, y + rh - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // ── tile body with gradient ──
  roundRect(0, 0, w, h, r);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#faf8f2');
  grad.addColorStop(0.4, '#f5f0e8');
  grad.addColorStop(1, '#e8e2d6');
  ctx.fillStyle = grad;
  ctx.fill();

  // ── subtle inner border ──
  roundRect(0.5, 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = '#c8c2b6';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── outer border ──
  roundRect(0, 0, w, h, r);
  ctx.strokeStyle = '#9e9890';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── inner face area (slightly recessed look) ──
  const inset = 4;
  roundRect(inset, inset, w - inset * 2, h - inset * 2, r - 2);
  const innerGrad = ctx.createLinearGradient(0, inset, 0, h - inset);
  innerGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
  innerGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // ── accent colour ──
  const colorHex = '#' + accentColor.toString(16).padStart(6, '0');

  // ── main character ──
  const isNumberSuit = suit === TileSuit.Wan || suit === TileSuit.Tiao || suit === TileSuit.Tong;

  if (isNumberSuit) {
    // Number suits: large number top, suit character bottom
    const numChar = mainChar.charAt(0); // e.g. "三" from "三万"
    const suitChar = mainChar.charAt(1); // e.g. "万"

    // Large number character
    ctx.fillStyle = colorHex;
    ctx.font = `bold ${Math.round(h * 0.38)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numChar, w / 2, h * 0.38);

    // Suit label below
    ctx.fillStyle = colorHex;
    ctx.globalAlpha = 0.7;
    ctx.font = `${Math.round(h * 0.22)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(suitChar, w / 2, h * 0.72);
    ctx.globalAlpha = 1.0;

    // Small Arabic numeral top-left corner
    ctx.fillStyle = colorHex;
    ctx.globalAlpha = 0.5;
    ctx.font = `bold ${Math.round(h * 0.14)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(value), 5, 4);
    ctx.globalAlpha = 1.0;
  } else if (suit === TileSuit.Wind) {
    // Winds: single large character
    ctx.fillStyle = colorHex;
    ctx.font = `bold ${Math.round(h * 0.42)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainChar, w / 2, h * 0.42);

    // "风" label below
    ctx.globalAlpha = 0.5;
    ctx.font = `${Math.round(h * 0.18)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText('风', w / 2, h * 0.74);
    ctx.globalAlpha = 1.0;
  } else {
    // Dragons: single character, stylised
    ctx.fillStyle = colorHex;
    ctx.font = `bold ${Math.round(h * 0.48)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainChar, w / 2, h * 0.46);

    // Special styling for 白 — draw empty box for "white dragon"
    if (value === DragonValue.White) {
      ctx.strokeStyle = '#4a6fa5';
      ctx.lineWidth = 2;
      const bx = w * 0.25, by = h * 0.2, bw = w * 0.5, bh = h * 0.5;
      roundRect(bx, by, bw, bh, 3);
      ctx.stroke();
    }
  }

  // ── coloured suit dot indicator (bottom-right) ──
  ctx.fillStyle = colorHex;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(w - 8, h - 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // ── register texture ──
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

/* ══════════════════════════════════════════════════════════
   BACK TEXTURE  (green decorative pattern)
   ══════════════════════════════════════════════════════════ */
function generateBackTexture(scene: Phaser.Scene): void {
  const key = 'tile-back';
  const w = TILE_W;
  const h = TILE_H;
  const r = CORNER_R;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // ── rounded rect helper ──
  const roundRect = (
    x: number, y: number, rw: number, rh: number, radius: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + rw - radius, y);
    ctx.quadraticCurveTo(x + rw, y, x + rw, y + radius);
    ctx.lineTo(x + rw, y + rh - radius);
    ctx.quadraticCurveTo(x + rw, y + rh, x + rw - radius, y + rh);
    ctx.lineTo(x + radius, y + rh);
    ctx.quadraticCurveTo(x, y + rh, x, y + rh - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // ── base green gradient ──
  roundRect(0, 0, w, h, r);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1f8c48');
  grad.addColorStop(0.5, '#1a6b3c');
  grad.addColorStop(1, '#145530');
  ctx.fillStyle = grad;
  ctx.fill();

  // ── outer border ──
  roundRect(0, 0, w, h, r);
  ctx.strokeStyle = '#0f4025';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── decorative inner border ──
  const inset = 4;
  roundRect(inset, inset, w - inset * 2, h - inset * 2, r - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── diamond lattice pattern ──
  ctx.save();
  // clip to inner rect
  roundRect(inset + 2, inset + 2, w - (inset + 2) * 2, h - (inset + 2) * 2, r - 3);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.8;
  const spacing = 8;
  // diagonal lines \
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  // diagonal lines /
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }
  ctx.restore();

  // ── centre circle ornament ──
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // ── inner circle ──
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // ── "胡" character in the centre ──
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = `bold ${Math.round(h * 0.2)}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('胡', w / 2, h / 2);

  // ── second decorative border ──
  const inset2 = 7;
  roundRect(inset2, inset2, w - inset2 * 2, h - inset2 * 2, r - 3);
  ctx.strokeStyle = 'rgba(255,215,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── register texture ──
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

/**
 * Returns the texture key for a given tile's face.
 */
export function getTileTextureKey(suit: TileSuit, value: number): string {
  return `face:${suit}-${value}`;
}
