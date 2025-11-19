const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 确保 assets 目录存在
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 创建基于 SVG 的 PartyTix Logo
// 根据描述：票券图标 + "PARTY TIX" 文字，黑色
const createLogoSVG = () => {
  return `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .ticket-icon { fill: none; stroke: white; stroke-width: 8; }
      .logo-text { fill: white; font-family: Arial, sans-serif; font-weight: bold; font-size: 80px; }
    </style>
  </defs>
  
  <!-- 票券图标 -->
  <g transform="translate(400, 100)">
    <!-- 主体矩形 -->
    <rect x="-120" y="-40" width="240" height="80" rx="8" class="ticket-icon"/>
    <!-- 左侧缺口 -->
    <path d="M -120 -40 Q -140 -40 -140 -20 Q -140 0 -120 0" class="ticket-icon"/>
    <path d="M -120 0 Q -140 0 -140 20 Q -140 40 -120 40" class="ticket-icon"/>
    <!-- 右侧缺口 -->
    <path d="M 120 -40 Q 140 -40 140 -20 Q 140 0 120 0" class="ticket-icon"/>
    <path d="M 120 0 Q 140 0 140 20 Q 140 40 120 40" class="ticket-icon"/>
  </g>
  
  <!-- PARTY TIX 文字 -->
  <text x="400" y="280" text-anchor="middle" class="logo-text">PARTY TIX</text>
</svg>
  `.trim();
};

// 生成 App Icon (1024x1024)
async function generateIcon() {
  console.log('🎨 生成 App Icon (1024x1024)...');
  
  const svg = createLogoSVG();
  const svgBuffer = Buffer.from(svg);
  
  // 创建黑色背景
  const icon = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 } // 纯黑 #000000
    }
  });
  
  // 将 SVG Logo 居中放置，留出边距（约 20%）
  const logoSize = 800; // Logo 原始尺寸
  const padding = 1024 * 0.15; // 15% 边距
  const scale = (1024 - padding * 2) / logoSize;
  const scaledWidth = logoSize * scale;
  const scaledHeight = 400 * scale;
  const x = (1024 - scaledWidth) / 2;
  const y = (1024 - scaledHeight) / 2;
  
  // 合成 Logo
  const logo = await sharp(svgBuffer)
    .resize(Math.round(scaledWidth), Math.round(scaledHeight), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();
  
  const output = await icon
    .composite([{
      input: logo,
      left: Math.round(x),
      top: Math.round(y)
    }])
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  
  console.log('✅ App Icon 已生成: assets/icon.png');
  return output;
}

// 生成 Splash (1284x2778)
async function generateSplash() {
  console.log('🚀 生成 Splash 启动页 (1284x2778)...');
  
  const svg = createLogoSVG();
  const svgBuffer = Buffer.from(svg);
  
  // 创建黑色背景
  const splash = sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 } // 纯黑 #000000
    }
  });
  
  // 将 SVG Logo 居中放置，保持美观比例
  const logoSize = 800;
  const maxWidth = 1284 * 0.6; // Logo 最大宽度为屏幕的 60%
  const scale = maxWidth / logoSize;
  const scaledWidth = logoSize * scale;
  const scaledHeight = 400 * scale;
  const x = (1284 - scaledWidth) / 2;
  const y = (2778 - scaledHeight) / 2;
  
  // 合成 Logo
  const logo = await sharp(svgBuffer)
    .resize(Math.round(scaledWidth), Math.round(scaledHeight), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();
  
  const output = await splash
    .composite([{
      input: logo,
      left: Math.round(x),
      top: Math.round(y)
    }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  
  console.log('✅ Splash 启动页已生成: assets/splash.png');
  return output;
}

// 主函数
async function main() {
  try {
    console.log('开始生成 PartyTix App 资源...\n');
    
    await generateIcon();
    await generateSplash();
    
    console.log('\n🎉 所有资源生成完成！');
    console.log('📁 文件位置:');
    console.log('   - assets/icon.png (1024x1024)');
    console.log('   - assets/splash.png (1284x2778)');
  } catch (error) {
    console.error('❌ 生成失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { generateIcon, generateSplash };

