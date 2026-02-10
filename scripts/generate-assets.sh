#!/bin/bash
# Generate mahjong tile assets using ImageMagick directly
set -e

ASSETS="/Users/zhilongzheng/Projects/hu/public/assets"
TILES="$ASSETS/tiles"
UI="$ASSETS/ui"
EFFECTS="$ASSETS/effects"

mkdir -p "$TILES" "$UI" "$EFFECTS"

FONT_CJK="Songti-SC"
FONT_SANS="Heiti-SC"
W=64 H=90

# Helper: create a tile with text
make_tile() {
  local outfile="$1" text="$2" color="$3" size="${4:-32}" yoff="${5:-0}" text2="$6" color2="$7" size2="${8:-20}" yoff2="${9:-18}"
  
  local y=$((H/2 + yoff))
  
  local cmd="convert -size ${W}x${H} xc:none"
  # Tile body
  cmd+=" -fill '#F5F0E8' -stroke '#8B7355' -strokewidth 1.5 -draw 'roundrectangle 1,1 62,88 6,6'"
  # Inner border
  cmd+=" -fill none -stroke '#D4C5A9' -strokewidth 0.5 -draw 'roundrectangle 3,3 61,87 4,4'"
  # Main text
  cmd+=" -fill '${color}' -stroke none -font ${FONT_CJK} -pointsize ${size} -gravity center -annotate +0+${yoff} '${text}'"
  # Optional second text
  if [ -n "$text2" ]; then
    cmd+=" -fill '${color2}' -font ${FONT_CJK} -pointsize ${size2} -gravity center -annotate +0+${yoff2} '${text2}'"
  fi
  cmd+=" '${outfile}'"
  
  eval $cmd
}

echo "=== 万 (Characters) 1-9 ==="
chars=("一" "二" "三" "四" "五" "六" "七" "八" "九")
for i in $(seq 1 9); do
  make_tile "$TILES/man_${i}.png" "${chars[$((i-1))]}" '#E63946' 28 -8 "万" '#1D3557' 20 18
  echo "✅ man_${i}"
done

echo "=== 条 (Bamboo) 1-9 ==="
for i in $(seq 1 9); do
  # For bamboo, draw the number + bamboo stick visual
  make_tile "$TILES/sou_${i}.png" "${i}" '#2D6A4F' 30 -8 "条" '#2D6A4F' 20 18
  echo "✅ sou_${i}"
done

echo "=== 筒 (Dots) 1-9 ==="
for i in $(seq 1 9); do
  make_tile "$TILES/pin_${i}.png" "${i}" '#457B9D' 30 -8 "筒" '#457B9D' 20 18
  echo "✅ pin_${i}"
done

echo "=== 风牌 (Winds) ==="
declare -A winds
winds=([east]="東:#2A9D8F" [south]="南:#E76F51" [west]="西:#F4A261" [north]="北:#264653")
for key in east south west north; do
  IFS=':' read -r char color <<< "${winds[$key]}"
  make_tile "$TILES/wind_${key}.png" "$char" "$color" 40 0
  echo "✅ wind_${key}"
done

echo "=== 箭牌 (Dragons) ==="
make_tile "$TILES/dragon_red.png" "中" '#E63946' 40 0
echo "✅ dragon_red"
make_tile "$TILES/dragon_green.png" "發" '#2D6A4F' 36 0
echo "✅ dragon_green"
# White dragon - special empty frame
convert -size ${W}x${H} xc:none \
  -fill '#F5F0E8' -stroke '#8B7355' -strokewidth 1.5 -draw 'roundrectangle 1,1 62,88 6,6' \
  -fill none -stroke '#457B9D' -strokewidth 1.5 -draw 'roundrectangle 16,20 48,70 3,3' \
  -fill '#8B7355' -stroke none -font $FONT_CJK -pointsize 20 -gravity center -annotate +0+0 '白' \
  "$TILES/dragon_white.png"
echo "✅ dragon_white"

echo "=== Tile Back ==="
convert -size ${W}x${H} xc:none \
  -fill '#1A2744' -stroke '#4A6FA5' -strokewidth 1.5 -draw 'roundrectangle 1,1 62,88 6,6' \
  -fill none -stroke '#4A6FA5' -strokewidth 1 -draw 'roundrectangle 8,8 56,82 3,3' \
  -fill '#4A6FA5' -stroke none -font $FONT_CJK -pointsize 20 -gravity center -annotate +0+0 '胡' \
  "$TILES/tile_back.png"
echo "✅ tile_back"

echo "=== Buttons ==="
declare -A btns
btns=([discard]="弃牌:#6C757D" [play]="出牌:#2A9D8F" [hu]="胡!:#E63946" [use_flower]="用花牌:#E9C46A")
BW=120 BH=44
for key in discard play hu use_flower; do
  IFS=':' read -r text color <<< "${btns[$key]}"
  convert -size ${BW}x${BH} xc:none \
    -fill "$color" -stroke 'white' -strokewidth 0.5 -draw "roundrectangle 1,1 $((BW-2)),$((BH-2)) 8,8" \
    -fill white -stroke none -font $FONT_SANS -pointsize 18 -gravity center -annotate +0+0 "$text" \
    "$UI/btn_${key}.png"
  echo "✅ btn_${key}"
done

echo "=== Panel Background ==="
convert -size 300x200 xc:none \
  -fill 'rgba(13,27,42,0.85)' -stroke '#1B2838' -strokewidth 2 -draw 'roundrectangle 0,0 299,199 12,12' \
  -fill none -stroke '#2A4A6B' -strokewidth 0.5 -draw 'roundrectangle 4,4 296,196 10,10' \
  "$UI/panel_bg.png"
echo "✅ panel_bg"

echo "=== Game Background ==="
convert -size 800x600 \
  -define gradient:center=400,300 -define gradient:radii=560,420 \
  radial-gradient:'#162447-#0D1117' \
  -fill '#1B2838' -font $FONT_CJK -pointsize 24 -gravity center \
  -annotate +0+0 '' \
  "$UI/game_bg.png"
echo "✅ game_bg"

echo "=== God Tiles ==="
declare -A gods
gods=([gamble]="🎲:赌博:#E63946" [insight]="👁:洞察:#457B9D" [fortune]="💰:财运:#E9C46A" [transform]="🔄:转化:#2A9D8F")
for key in gamble insight fortune transform; do
  IFS=':' read -r emoji label color <<< "${gods[$key]}"
  convert -size 64x64 xc:none \
    -fill '#0D1B2A' -stroke "$color" -strokewidth 2 -draw 'circle 32,32 32,2' \
    -fill "$color" -font $FONT_SANS -pointsize 10 -gravity south -annotate +0+4 "$label" \
    "$EFFECTS/god_${key}.png"
  echo "✅ god_${key}"
done

echo "=== Flower Cards ==="
declare -A flowers
flowers=([plum]="梅:#E63946" [orchid]="蘭:#9B5DE5" [bamboo]="竹:#2D6A4F" [chrysanthemum]="菊:#E9C46A")
for key in plum orchid bamboo chrysanthemum; do
  IFS=':' read -r char color <<< "${flowers[$key]}"
  make_tile "$EFFECTS/flower_${key}.png" "$char" "$color" 30 -4 "花牌" '#8B7355' 10 24
  echo "✅ flower_${key}"
done

echo "=== Material Textures ==="
declare -A mats
mats=([gold]="金:#FFD700:#B8860B" [jade]="玉:#50C878:#2E8B57" [ice]="冰:#A8DADC:#457B9D" [bamboo_mat]="竹:#8FBC8F:#2D6A4F" [glass]="璃:#E0E0E0:#9E9E9E" [bronze]="铜:#CD7F32:#8B4513" [silver]="银:#C0C0C0:#808080")
for key in gold jade ice bamboo_mat glass bronze silver; do
  IFS=':' read -r char c1 c2 <<< "${mats[$key]}"
  convert -size 64x64 "gradient:${c1}-${c2}" \
    -draw 'roundrectangle 0,0 63,63 8,8' \
    -fill white -font $FONT_CJK -pointsize 28 -gravity center -annotate +0+0 "$char" \
    \( +clone -alpha extract -draw 'roundrectangle 0,0 63,63 8,8' \) -alpha off -compose CopyOpacity -composite \
    "$EFFECTS/material_${key}.png"
  echo "✅ material_${key}"
done

echo ""
echo "🎉 All assets generated!"
echo ""
find "$ASSETS" -name "*.png" -size +0 | wc -l | xargs -I{} echo "{} PNG files created"
