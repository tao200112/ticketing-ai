# 🔍 二维码扫描问题诊断指南

## 已修复的问题

### 1. 状态更新时序问题 ✅
**问题**: `startQRDetection()` 检查 `isScanning` 状态，但React状态更新是异步的，导致检测循环无法启动。

**修复**: 移除了对 `isScanning` 的依赖检查，直接检查 `videoRef` 和 `canvasRef`。

### 2. 视频准备就绪问题 ✅
**问题**: 视频可能还没完全准备好就开始检测。

**修复**: 
- 添加了视频元数据加载等待
- 添加了300ms延迟启动检测
- 添加了视频尺寸检查

### 3. 调试信息不足 ✅
**修复**: 添加了详细的控制台日志，方便诊断问题。

---

## 📋 请按以下步骤操作

### 步骤 1: 打开浏览器控制台

1. 按 `F12` 或右键点击页面 → "检查" / "Inspect"
2. 切换到 **Console（控制台）** 标签

### 步骤 2: 开始扫描

1. 点击 **"Start Scanning"** 按钮
2. 观察控制台输出，应该看到：
   ```
   🎥 Starting camera...
   🔍 Starting QR detection... { hasVideo: true, hasCanvas: true, isScanning: true }
   ```

### 步骤 3: 检查可能的问题

#### 问题 A: 没有看到 "🎥 Starting camera..." 日志
**可能原因**: 摄像头权限被拒绝
**解决方法**:
- 检查浏览器地址栏的摄像头图标
- 点击并允许摄像头权限
- 刷新页面重试

#### 问题 B: 看到 "⚠️ Video or canvas not available"
**可能原因**: 视频或canvas元素未正确初始化
**解决方法**:
- 刷新页面
- 检查网络连接
- 尝试使用不同的浏览器

#### 问题 C: 看到 "❌ Frame capture error"
**可能原因**: 跨域或权限问题
**解决方法**:
- 确保使用 HTTPS 或 localhost
- 检查浏览器控制台的详细错误信息

#### 问题 D: 没有任何日志输出
**可能原因**: 
- 代码未更新（需要重新部署）
- 浏览器缓存问题

**解决方法**:
1. **硬刷新页面**: `Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
2. **清除浏览器缓存**
3. **检查代码是否已部署**: 确认最新代码已推送到服务器

### 步骤 4: 测试QR码

1. 确保摄像头能正常显示画面
2. 将摄像头对准二维码
3. 保持稳定，等待几秒钟
4. 如果检测到，应该看到：
   ```
   ✅ QR Code detected: [二维码内容]
   ```

---

## 🔧 如果仍然无法工作

### 检查清单

- [ ] 浏览器控制台是否打开？
- [ ] 是否看到 "🎥 Starting camera..." 日志？
- [ ] 是否看到 "🔍 Starting QR detection..." 日志？
- [ ] 摄像头是否正常显示画面？
- [ ] 是否使用了 HTTPS 或 localhost？
- [ ] 是否允许了摄像头权限？
- [ ] 是否硬刷新了页面（Ctrl+Shift+R）？

### 手动测试QR码检测

在浏览器控制台输入以下代码来测试：

```javascript
// 检查元素是否存在
console.log('Video:', document.querySelector('video'))
console.log('Canvas:', document.querySelector('canvas'))

// 检查视频状态
const video = document.querySelector('video')
if (video) {
  console.log('Video readyState:', video.readyState)
  console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
  console.log('Video playing:', !video.paused)
}
```

### 联系支持

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整错误信息（截图或复制）
2. 浏览器类型和版本
3. 操作系统
4. 是否在移动设备上测试

---

## 📝 技术细节

### 修复的关键点

1. **状态检查**: 移除了对异步状态的依赖
2. **时序控制**: 添加了视频就绪等待和延迟启动
3. **错误处理**: 改进了错误捕获和日志记录
4. **尺寸验证**: 添加了视频尺寸检查，避免无效检测

### 检测流程

```
启动摄像头 
  ↓
等待视频元数据加载
  ↓
延迟300ms启动检测
  ↓
每100ms检查一次视频帧
  ↓
检测到QR码 → 停止扫描 → 验证票据
```

---

**最后更新**: 2025-01-29

