/**
 * 这是一个用于生成不同尺寸favicon的参考脚本
 * 实际使用时需要安装sharp库: npm install sharp
 * 
 * 运行方式: node favicon-generator.js
 */

/*
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 确保输出目录存在
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}

// 从SVG生成不同尺寸的PNG
async function generateIcons() {
  const sizes = [16, 32, 48, 96, 144, 192, 512];
  
  for (const size of sizes) {
    await sharp('favicon.svg')
      .resize(size, size)
      .png()
      .toFile(path.join(iconDir, `favicon-${size}x${size}.png`));
    
    console.log(`生成了 ${size}x${size} 图标`);
  }
  
  // 生成 ICO 文件 (如需此功能，需要额外安装: npm install to-ico)
  // const toIco = require('to-ico');
  // const pngBuffers = sizes.filter(size => size <= 256).map(size => 
  //   fs.readFileSync(path.join(iconDir, `favicon-${size}x${size}.png`))
  // );
  
  // toIco(pngBuffers).then(buf => {
  //   fs.writeFileSync('favicon.ico', buf);
  //   console.log('生成了 favicon.ico');
  // });
  
  // 生成网站清单文件
  const manifest = {
    name: "列车长管理系统",
    short_name: "列车长管理",
    icons: sizes.map(size => ({
      src: `/icons/favicon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png"
    })),
    theme_color: "#0ea5e9",
    background_color: "#ffffff",
    display: "standalone"
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('生成了网站清单文件');
}

generateIcons().catch(console.error);
*/

// 注释：这个脚本仅用于参考，需要在Node.js环境中使用
// 并安装必要的依赖后才能运行 