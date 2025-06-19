const fs = require('fs');
const { createCanvas } = require('canvas');

// アイコンのサイズ
const sizes = [16, 48, 128];

// 絵文字アイコンを生成
sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();
    
    // 絵文字
    ctx.font = `${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText('😊', size / 2, size / 2);
    
    // PNGとして保存
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`images/icon${size}.png`, buffer);
    console.log(`Generated icon${size}.png`);
});

console.log('All icons generated successfully!');