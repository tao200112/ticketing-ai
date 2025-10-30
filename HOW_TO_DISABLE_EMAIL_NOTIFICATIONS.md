# 📧 如何取消 GitHub Actions 邮件推送

## 🎯 快速方案（推荐）

### 方法1：GitHub 个人设置（最简单）

1. **访问 GitHub Settings**
   - 点击右上角头像
   - 选择 **Settings**

2. **进入通知设置**
   - 左侧菜单选择 **Notifications**

3. **配置 Actions 通知**
   - 找到 **"Actions"** 部分
   - 取消勾选以下选项：
     - ❌ **"Failed workflow runs"**（失败的工作流运行）
     - ❌ **"Workflow run requests"**（工作流运行请求）

4. **保存设置**
   - 滚动到底部，点击 **"Save"**

**效果**：不会再收到 GitHub Actions 失败的邮件通知

---

### 方法2：仓库级别的 Watch 设置

1. **访问仓库页面**
   - 打开 `https://github.com/你的用户名/ticketing-ai`

2. **修改 Watch 设置**
   - 点击仓库页面右上角的 **"Watch"** 按钮
   - 选择 **"Custom"** → **"Actions"**
   - 取消勾选 **"Failed workflow runs"**

**效果**：只对这个仓库禁用 Actions 失败通知

---

### 方法3：邮箱过滤规则

如果您使用 Gmail、Outlook 等邮件服务：

1. **Gmail**
   - 创建过滤规则：`from:(noreply@github.com) subject:(workflow)`
   - 选择：**删除邮件** 或 **标记为已读并归档**

2. **Outlook**
   - 规则 → 创建规则
   - 条件：发件人包含 `noreply@github.com` 且主题包含 `workflow`
   - 操作：移动到已删除邮件或标记为已读

---

## ⚠️ 临时禁用工作流（可选）

如果暂时不想运行工作流，可以临时禁用：

```bash
# 重命名工作流文件
git mv .github/workflows/release.yml .github/workflows/release.yml.disabled
git commit -m "temp: disable release workflow"
git push
```

**恢复时：**
```bash
git mv .github/workflows/release.yml.disabled .github/workflows/release.yml
git commit -m "re-enable release workflow"
git push
```

---

## 📝 推荐配置

**最推荐的配置：**
- ✅ 保留 Issues、Pull requests 通知
- ✅ 保留 Mentions 和 Comments 通知
- ❌ 取消 Actions 失败通知（因为可以手动查看）
- ✅ 保留 Actions 成功通知（可选）

这样既能及时收到重要通知，又不会被构建失败频繁打扰。

