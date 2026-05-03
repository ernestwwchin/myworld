const fs = require('fs');
const { PNG } = require('pngjs');

const base = 'public/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7';
const framesDir = base + '/frames';

function getPixels(png, x, y, w, h) {
  const buf = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const si = ((y + r) * png.width + (x + c)) * 4;
      const di = (r * w + c) * 4;
      buf[di] = png.data[si];
      buf[di + 1] = png.data[si + 1];
      buf[di + 2] = png.data[si + 2];
      buf[di + 3] = png.data[si + 3];
    }
  }
  return buf;
}

// Diagnose: compare wall_top_mid from main sheet vs frame PNG vs walls_low cell
const mainPng = PNG.sync.read(fs.readFileSync(base + '/0x72_DungeonTilesetII_v1.7.png'));
const atlas = JSON.parse(fs.readFileSync('public/assets/vendor/0x72_dungeon/0x72_dungeon.json', 'utf8'));
const low = PNG.sync.read(fs.readFileSync(base + '/atlas_walls_low-16x16.png'));
const framePng = PNG.sync.read(fs.readFileSync(framesDir + '/wall_top_mid.png'));

// wall_top_mid is at x:32, y:0 in main sheet
const mainPixels = getPixels(mainPng, 32, 0, 16, 16);
const framePixels = Buffer.from(framePng.data);

// Where might wall_top_mid be in walls_low? Let's check a few cells
console.log('=== Diagnostic: wall_top_mid ===');
console.log('Main sheet (32,0) first 20 bytes:', Array.from(mainPixels.slice(0, 20)));
console.log('Frame PNG first 20 bytes:', Array.from(framePixels.slice(0, 20)));

// Show first row of main sheet pixels for non-transparent pixels
console.log('\nMain sheet wall_top_mid non-transparent pixel count:', 
  Array.from({length: 256}, (_, i) => mainPixels[i*4+3] > 0 ? 1 : 0).reduce((a,b) => a+b));
console.log('Frame PNG wall_top_mid non-transparent pixel count:', 
  Array.from({length: 256}, (_, i) => framePixels[i*4+3] > 0 ? 1 : 0).reduce((a,b) => a+b));

// Check every cell in walls_low and show alpha pattern similarity
console.log('\n=== walls_low: alpha-only matching against all known frame PNGs ===');

// Build alpha signatures from frame PNGs 
const frameSigs = [];
const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.png'));
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(framesDir + '/' + f));
  if (png.width === 16 && png.height === 16) {
    // Create alpha-only signature (just the shape)
    const alpha = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) alpha[i] = png.data[i * 4 + 3] > 0 ? 1 : 0;
    frameSigs.push({ name: f.replace('.png', ''), alpha });
  }
}

function matchAlpha(cellData) {
  const cellAlpha = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) cellAlpha[i] = cellData[i * 4 + 3] > 0 ? 1 : 0;
  
  let bestName = '(?)';
  let bestScore = 0;
  for (const sig of frameSigs) {
    let match = 0;
    for (let i = 0; i < 256; i++) {
      if (cellAlpha[i] === sig.alpha[i]) match++;
    }
    const score = match / 256;
    if (score > bestScore) { bestScore = score; bestName = sig.name; }
  }
  return { name: bestName, score: bestScore };
}

// Also try matching non-alpha RGB for non-transparent pixels
function matchRGB(cellData) {
  let bestName = '(?)';
  let bestScore = 0;
  
  for (const f of files) {
    const png = PNG.sync.read(fs.readFileSync(framesDir + '/' + f));
    if (png.width !== 16 || png.height !== 16) continue;
    const name = f.replace('.png', '');
    let matchPixels = 0;
    let totalPixels = 0;
    for (let i = 0; i < 256; i++) {
      const ca = cellData[i * 4 + 3];
      const fa = png.data[i * 4 + 3];
      if (ca > 0 && fa > 0) {
        totalPixels++;
        const dr = Math.abs(cellData[i*4] - png.data[i*4]);
        const dg = Math.abs(cellData[i*4+1] - png.data[i*4+1]);
        const db = Math.abs(cellData[i*4+2] - png.data[i*4+2]);
        if (dr < 10 && dg < 10 && db < 10) matchPixels++;
      }
    }
    const score = totalPixels > 0 ? matchPixels / totalPixels : 0;
    if (score > bestScore) { bestScore = score; bestName = name; }
  }
  return { name: bestName, score: bestScore };
}

function isEmpty(px) {
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] > 0) return false;
  }
  return true;
}

// Map walls_low with alpha matching
const lc = low.width / 16;
const lr = low.height / 16;
console.log('\n=== atlas_walls_low-16x16.png (' + low.width + 'x' + low.height + ') = ' + lc + 'x' + lr + ' ===');
for (let r = 0; r < lr; r++) {
  const labels = [];
  for (let c = 0; c < lc; c++) {
    const px = getPixels(low, c * 16, r * 16, 16, 16);
    if (isEmpty(px)) { labels.push('(empty)'); continue; }
    const m = matchAlpha(px);
    labels.push(m.name + ' (' + (m.score*100).toFixed(0) + '%)');
  }
  console.log('  row ' + r + ': ' + labels.join(' | '));
}
