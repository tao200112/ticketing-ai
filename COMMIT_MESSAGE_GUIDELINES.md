# Git Commit Message Guidelines

## Problem: Garbled Commit Messages

Many commit messages in the repository history show garbled characters (乱码) because they were written in Chinese but are not properly encoded when displayed in some Git interfaces.

## Solution: Use English for All Commit Messages

### Guidelines

1. **Always use English** for commit messages
2. **Follow conventional commit format**:
   - `feat: add new feature`
   - `fix體: fix bug`
   - `refactor: refactor code`
   - `docs: update documentation`
   - `style: formatting changes`
   - `test: add tests`
   - `chore: maintenance tasks`

3. **Keep messages concise** but descriptive
4. **Use present tense** ("add feature" not "added feature")

### Examples

✅ **Good:**
```
feat: add user registration form
fix: resolve authentication error
refactor: translate UI to English
docs: update API documentation
```

❌ **Bad:**
```
添加用户注册表单
修复认证错误
更新文档
```

### Why English?

- **Avoids encoding issues** - English uses ASCII which is universally supported
- **Better for international teams** - Everyone can understand
- **GitHub/GitLab display** - No encoding problems in web interfaces
- **Better searchability** - Easier to search commit history

## Current Git Configuration

To prevent future encoding issues, the following Git config has been set:

```bash
git config --global core.quotepath false
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
```

## Fixing Existing Garbled Messages

**Note:** You generally cannot change commit messages that have already been pushed to a shared repository without rewriting history (which can be disruptive).

However, for future commits:
- Always write commit messages in English
- The encoding configuration above will help prevent new issues

## Best Practices

1. **Write commit messages before committing** - Think about what you changed
2. **Use the imperative mood** - "Add feature" not "Added feature" or "Adds feature"
3. **Keep first line under 50 characters** - Use body for details if needed
4. **Reference issues** - Use `fixes #123` or `closes #456` when applicable

Example of a good commit message:
```
feat: add user registration with email verification

- Implement registration form with validation
- Add email verification flow
- Update error handling to show specific messages

Closes #123
```

## Verification

To verify your Git configuration:
```bash
git config --list | grep -i encoding
```

You should see:
```
i18n.commitencoding=utf-8
i18n.logoutputencoding=utf-8
core.quotepath=false
```

