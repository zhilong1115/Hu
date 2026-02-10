#!/usr/bin/env node
/**
 * Generate mahjong tile assets as SVG files for HU roguelike game
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = '/Users/zhilongzheng/Projects/hu/public/assets';
const TILES = path.join(ASSETS, 'tiles');
const UI = path.join(ASSETS, 'ui');
const EFFECTS = path.join(ASSETS, 'effects');

[TILES, UI, EFFECTS].forEach(d => fs.mkdirSync(d, { recursive: true }));

// Clean old PNGs
for (const dir of [TILES, UI, EFFECTS]) {
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(dir, f));
  }
}

const W = 64, H = 90;

function save(dir, name, content) {
  fs.writeFileSync(path.join(dir, name + '.svg'), content);
  console.log(`✅ ${name}`);
}

function tile(content, bg = '#F5F0E8') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="1" y="1" width="62" height="88" rx="6" ry="6" fill="${bg}" stroke="#8B7355" stroke-width="1.5"/>
  <rect x="3" y="3" width="58" height="84" rx="4" ry="4" fill="none" stroke="#D4C5A9" stroke-width="0.5"/>
  ${content}
</svg>`;
}

// ========== PRIORITY 1: Tiles ==========

// 万 (Characters) 1-9
const manChars = ['一','二','三','四','五','六','七','八','九'];
for (let i = 1; i <= 9; i++) {
  save(TILES, `man_${i}`, tile(`
    <text x="32" y="40" text-anchor="middle" font-family="'Songti SC','SimSun','STSong',serif" font-size="26" font-weight="bold" fill="#E63946">${manChars[i-1]}</text>
    <text x="32" y="72" text-anchor="middle" font-family="'Songti SC','SimSun','STSong',serif" font-size="22" font-weight="bold" fill="#1D3557">万</text>
  `));
}

// 条 (Bamboo) 1-9
for (let i = 1; i <= 9; i++) {
  let bamboo = '';
  if (i === 1) {
    bamboo = `<g transform="translate(32,42)">
      <ellipse cx="0" cy="0" rx="8" ry="22" fill="#2D6A4F" stroke="#1B4332" stroke-width="1"/>
      <line x1="0" y1="-22" x2="0" y2="22" stroke="#40916C" stroke-width="2"/>
      <line x1="-4" y1="-10" x2="4" y2="-10" stroke="#52B788" stroke-width="1"/>
      <line x1="-4" y1="0" x2="4" y2="0" stroke="#52B788" stroke-width="1"/>
      <line x1="-4" y1="10" x2="4" y2="10" stroke="#52B788" stroke-width="1"/>
    </g>`;
  } else {
    const cols = i <= 3 ? 1 : i <= 6 ? 2 : 3;
    const rows = Math.ceil(i / cols);
    const bw = 8, bh = Math.min(18, 65 / rows);
    const sx = 32 - (cols - 1) * (bw + 4) / 2;
    const sy = 45 - (rows - 1) * (bh + 3) / 2;
    let count = 0;
    for (let r = 0; r < rows && count < i; r++) {
      for (let c = 0; c < cols && count < i; c++) {
        const x = sx + c * (bw + 4);
        const y = sy + r * (bh + 3);
        const fill = count % 2 === 0 ? '#2D6A4F' : '#52B788';
        bamboo += `<rect x="${x-bw/2}" y="${y-bh/2}" width="${bw}" height="${bh}" rx="2" fill="${fill}" stroke="#1B4332" stroke-width="0.5"/>`;
        bamboo += `<line x1="${x}" y1="${y-bh/2}" x2="${x}" y2="${y+bh/2}" stroke="#40916C" stroke-width="0.8"/>`;
        count++;
      }
    }
  }
  save(TILES, `sou_${i}`, tile(bamboo));
}

// 筒 (Dots) 1-9
for (let i = 1; i <= 9; i++) {
  let dots = '';
  if (i === 1) {
    dots = `<circle cx="32" cy="45" r="16" fill="#457B9D" stroke="#1D3557" stroke-width="1.5"/>
      <circle cx="32" cy="45" r="10" fill="#A8DADC" stroke="#457B9D" stroke-width="1"/>
      <circle cx="32" cy="45" r="4" fill="#1D3557"/>`;
  } else {
    const positions = {
      2: [[32,30],[32,60]],
      3: [[32,25],[18,58],[46,58]],
      4: [[20,28],[44,28],[20,62],[44,62]],
      5: [[20,25],[44,25],[32,45],[20,65],[44,65]],
      6: [[20,24],[44,24],[20,45],[44,45],[20,66],[44,66]],
      7: [[20,20],[44,20],[32,40],[20,52],[44,52],[20,70],[44,70]],
      8: [[18,20],[44,20],[18,38],[44,38],[18,55],[44,55],[18,72],[44,72]],
      9: [[18,20],[32,20],[46,20],[18,45],[32,45],[46,45],[18,70],[32,70],[46,70]],
    };
    const r = i <= 4 ? 9 : i <= 6 ? 8 : 7;
    const colors = ['#E63946','#457B9D','#2A9D8F','#E9C46A','#F4A261','#264653','#9B5DE5','#E76F51','#00BBF9'];
    positions[i].forEach((p, idx) => {
      dots += `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${colors[idx % colors.length]}" stroke="#264653" stroke-width="0.7"/>`;
      dots += `<circle cx="${p[0]}" cy="${p[1]}" r="${r*0.4}" fill="white" opacity="0.35"/>`;
    });
  }
  save(TILES, `pin_${i}`, tile(dots));
}

// 风牌 (Winds)
const winds = [
  { id: 'east', ch: '東', color: '#2A9D8F' },
  { id: 'south', ch: '南', color: '#E76F51' },
  { id: 'west', ch: '西', color: '#F4A261' },
  { id: 'north', ch: '北', color: '#264653' },
];
for (const w of winds) {
  save(TILES, `wind_${w.id}`, tile(`
    <text x="32" y="58" text-anchor="middle" font-family="'Songti SC','SimSun',serif" font-size="42" font-weight="bold" fill="${w.color}">${w.ch}</text>
  `));
}

// 箭牌 (Dragons)
save(TILES, 'dragon_red', tile(`
  <rect x="16" y="18" width="32" height="54" rx="3" fill="none" stroke="#E63946" stroke-width="2"/>
  <text x="32" y="56" text-anchor="middle" font-family="'Songti SC','SimSun',serif" font-size="38" font-weight="bold" fill="#E63946">中</text>
`));
save(TILES, 'dragon_green', tile(`
  <text x="32" y="58" text-anchor="middle" font-family="'Songti SC','SimSun',serif" font-size="38" font-weight="bold" fill="#2D6A4F">發</text>
`));
save(TILES, 'dragon_white', tile(`
  <rect x="14" y="16" width="36" height="58" rx="4" fill="none" stroke="#457B9D" stroke-width="1.5" stroke-dasharray="4,2"/>
  <text x="32" y="54" text-anchor="middle" font-family="'Songti SC','SimSun',serif" font-size="28" fill="#8B7355" opacity="0.6">白</text>
`));

// Tile back
save(TILES, 'tile_back', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="checkerboard" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#1A2744"/>
      <rect width="5" height="5" fill="#1E2F52" opacity="0.5"/>
      <rect x="5" y="5" width="5" height="5" fill="#1E2F52" opacity="0.5"/>
    </pattern>
  </defs>
  <rect x="1" y="1" width="62" height="88" rx="6" fill="url(#checkerboard)" stroke="#4A6FA5" stroke-width="1.5"/>
  <rect x="8" y="8" width="48" height="74" rx="3" fill="none" stroke="#4A6FA5" stroke-width="1" opacity="0.5"/>
  <text x="32" y="52" text-anchor="middle" font-family="'Songti SC',serif" font-size="22" fill="#4A6FA5" opacity="0.4">胡</text>
</svg>`);

// ========== PRIORITY 2: UI ==========

const buttons = [
  { id: 'discard', text: '弃牌', color: '#6C757D' },
  { id: 'play', text: '出牌', color: '#2A9D8F' },
  { id: 'hu', text: '胡!', color: '#E63946' },
  { id: 'use_flower', text: '用花牌', color: '#E9C46A' },
];
for (const b of buttons) {
  save(UI, `btn_${b.id}`, `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44">
  <defs>
    <linearGradient id="bg_${b.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${b.color}"/>
      <stop offset="100%" stop-color="${b.color}" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="118" height="42" rx="8" fill="url(#bg_${b.id})" stroke="white" stroke-width="1" stroke-opacity="0.3"/>
  <text x="60" y="28" text-anchor="middle" font-family="'Heiti SC','Microsoft YaHei',sans-serif" font-size="18" font-weight="bold" fill="white">${b.text}</text>
</svg>`);
}

// Panel background
save(UI, 'panel_bg', `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
  <rect width="300" height="200" rx="12" fill="#0D1B2A" fill-opacity="0.85" stroke="#1B2838" stroke-width="2"/>
  <rect x="4" y="4" width="292" height="192" rx="10" fill="none" stroke="#2A4A6B" stroke-width="0.5" opacity="0.5"/>
</svg>`);

// Game background
save(UI, 'game_bg', `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <radialGradient id="rbg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#162447"/>
      <stop offset="100%" stop-color="#0D1117"/>
    </radialGradient>
    <pattern id="mjpat" width="80" height="80" patternUnits="userSpaceOnUse">
      <text x="40" y="48" text-anchor="middle" font-family="'Songti SC',serif" font-size="22" fill="#1B2838" opacity="0.12">胡</text>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#rbg)"/>
  <rect width="800" height="600" fill="url(#mjpat)"/>
</svg>`);

// ========== PRIORITY 3: Special ==========

// God tile icons
const gods = [
  { id: 'gamble', emoji: '🎲', label: '赌博', color: '#E63946' },
  { id: 'insight', emoji: '👁', label: '洞察', color: '#457B9D' },
  { id: 'fortune', emoji: '💰', label: '财运', color: '#E9C46A' },
  { id: 'transform', emoji: '🔄', label: '转化', color: '#2A9D8F' },
];
for (const g of gods) {
  save(EFFECTS, `god_${g.id}`, `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="glow_${g.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${g.color}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${g.color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="#0D1B2A" stroke="${g.color}" stroke-width="2"/>
  <circle cx="32" cy="32" r="28" fill="url(#glow_${g.id})"/>
  <text x="32" y="38" text-anchor="middle" font-size="24">${g.emoji}</text>
  <text x="32" y="56" text-anchor="middle" font-family="'Heiti SC',sans-serif" font-size="9" fill="${g.color}">${g.label}</text>
</svg>`);
}

// Flower cards
const flowers = [
  { id: 'plum', ch: '梅', color: '#E63946' },
  { id: 'orchid', ch: '蘭', color: '#9B5DE5' },
  { id: 'bamboo', ch: '竹', color: '#2D6A4F' },
  { id: 'chrysanthemum', ch: '菊', color: '#E9C46A' },
];
for (const f of flowers) {
  save(EFFECTS, `flower_${f.id}`, tile(`
    <circle cx="32" cy="38" r="18" fill="none" stroke="${f.color}" stroke-width="1.5" opacity="0.3"/>
    <text x="32" y="48" text-anchor="middle" font-family="'Songti SC',serif" font-size="30" font-weight="bold" fill="${f.color}">${f.ch}</text>
    <text x="32" y="78" text-anchor="middle" font-family="'Songti SC',serif" font-size="10" fill="#8B7355">花牌</text>
  `));
}

// Material textures
const mats = [
  { id: 'gold', ch: '金', c1: '#FFD700', c2: '#B8860B' },
  { id: 'jade', ch: '玉', c1: '#50C878', c2: '#2E8B57' },
  { id: 'ice', ch: '冰', c1: '#A8DADC', c2: '#457B9D' },
  { id: 'bamboo_mat', ch: '竹', c1: '#8FBC8F', c2: '#2D6A4F' },
  { id: 'glass', ch: '璃', c1: '#E0E0E0', c2: '#9E9E9E' },
  { id: 'bronze', ch: '铜', c1: '#CD7F32', c2: '#8B4513' },
  { id: 'silver', ch: '银', c1: '#C0C0C0', c2: '#808080' },
];
for (const m of mats) {
  save(EFFECTS, `material_${m.id}`, `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="mat_${m.id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${m.c1}"/>
      <stop offset="100%" stop-color="${m.c2}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="8" fill="url(#mat_${m.id})"/>
  <text x="32" y="42" text-anchor="middle" font-family="'Songti SC',serif" font-size="28" fill="white" opacity="0.6">${m.ch}</text>
</svg>`);
}

// Summary
let total = 0;
for (const dir of [TILES, UI, EFFECTS]) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  total += files.length;
}
console.log(`\n🎉 ${total} SVG assets generated!`);
