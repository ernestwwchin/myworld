const fs = require('fs');
const {PNG} = require('pngjs');
const hi = PNG.sync.read(fs.readFileSync('public/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/atlas_walls_high-16x32.png'));

function describeCell(col, row) {
  let transL = 0, transR = 0, transTotal = 0, darkTotal = 0;
  for (let y = 11; y < 32; y++) {
    for (let x = 0; x < 16; x++) {
      const i = ((row*32+y) * hi.width + (col*16+x)) * 4;
      const a = hi.data[i+3];
      if (a === 0) {
        transTotal++;
        if (x < 5) transL++;
        if (x > 10) transR++;
      } else {
        const b = (hi.data[i]+hi.data[i+1]+hi.data[i+2])/3;
        if (b < 40) darkTotal++;
      }
    }
  }
  if (transTotal > 300) return 'empty';
  let sides = '';
  if (transL > 80) sides += 'L';
  if (transR > 80) sides += 'R';
  if (sides === '') sides = '-';
  let fill = darkTotal > 50 ? '+void' : '';
  return sides + fill;
}

console.log('walls_high 24x4 - structure summary (y=11-31)');
console.log('L=left transparent, R=right transparent, -=full width, +void=dark fill');
console.log('');
for (let r = 0; r < 4; r++) {
  let line = 'Row ' + r + ': ';
  for (let c = 0; c < 24; c++) {
    const d = describeCell(c, r);
    line += (c+','+r).padEnd(5) + d.padEnd(10);
  }
  console.log(line);
  console.log('');
}

// Now pixel maps for rows 0-3, but only the bottom portion (y=11-31)
function pixelMap(col, row) {
  let lines = [];
  for (let y = 11; y < 32; y++) {
    let line = '';
    for (let x = 0; x < 16; x++) {
      const i = ((row*32+y) * hi.width + (col*16+x)) * 4;
      const a = hi.data[i+3];
      if (a === 0) { line += '.'; continue; }
      const b = (hi.data[i]+hi.data[i+1]+hi.data[i+2])/3;
      if (b < 35) line += '#';
      else if (b < 60) line += 'X';
      else if (b < 90) line += 'o';
      else line += 'O';
    }
    lines.push(line);
  }
  return lines;
}

// Print sets side by side for each row: cols 0-3, 4-7, 8-11
console.log('\n=== PIXEL MAPS (y=11-31 only, wall structure) ===\n');
for (let row = 0; row < 4; row++) {
  console.log('======== ROW ' + row + ' ========');
  // 3 groups of 4
  for (let g = 0; g < 3; g++) {
    const maps = [];
    for (let t = 0; t < 4; t++) {
      maps.push(pixelMap(g*4+t, row));
    }
    console.log('  Cols ' + (g*4) + '-' + (g*4+3) + ':');
    for (let y = 0; y < 21; y++) {
      let line = '  ';
      for (let t = 0; t < 4; t++) {
        line += maps[t][y] + ' ';
      }
      console.log(line);
    }
    console.log('');
  }
}
