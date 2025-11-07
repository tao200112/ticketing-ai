# 错误处理改进总结

## 问题描述

之前所有数据库错误都返回通用的 "Database error saving new user" 消息，无法区分不同的错误类型，导致难以诊断问题。

## 修复内容

### 1. 创建用户错误处理 (`app/api/auth/callback/route.js`)

现在根据不同的 PostgreSQL 错误代码返回具体的错误消息：

| 错误代码 | 错误类型 | 返回消息 |
|---------|---------|---------|
| `23505` | 唯一约束违反 | "User with this email already exists" |
| `23502` | NOT NULL 约束违反 | "Missing required field: {字段名}" |
| `23514` | CHECK 约束违反 | "Data validation failed: {约束名} - {详情}" |
| `42P01` | 表不存在 | "Database table not found. Please contact support." |
| `42703` | 列不存在 | "Database column not found: {列名}. Please contact support." |
| `PGRST116` | PostgREST 无行返回 | "Failed to create user account. Please try again." |
| 其他 | 通用错误 | 使用 `error.message`，如果可用则添加 `details` 和 `hint` |

### 2. 更新用户错误处理

同样根据错误代码返回具体消息：

| 错误代码 | 错误类型 | 返回消息 |
|---------|---------|---------|
| `23505` | 唯一约束违反 | "User data conflict. Please contact support." |
| `23502` | NOT NULL 约束违反 | "Missing required field: {字段名}" |
| `23514` | CHECK 约束违反 | "Data validation failed: {约束名} - {详情}" |
| `42P01` | 表不存在 | "Database table not found. Please contact support." |
| `42703` | 列不存在 | "Database column not found: {列名}. Please contact support." |
| 其他 | 通用错误 | 使用 `error.message`，如果可用则添加 `details` 和 `hint` |

### 3. 查询用户错误处理

| 错误代码 | 错误类型 | 返回消息 |
|---------|---------|---------|
| `42P01` | 表不存在 | "Database table not found. Please contact support." |
| `42703` | 列不存在 | "Database column not found: {列名}. Please contact support." |
| 其他 | 通用错误 | 使用 `error.message`，如果可用则添加 `details` |

## 错误消息优先级

1. **特定错误代码匹配** - 返回用户友好的消息
2. **error.message** - 使用数据库返回的错误消息
3. **error.details** - 如果 message 不可用，使用 details
4. **error.hint** - 如果前两者都不可用，使用 hint
5. **默认消息** - 最后的后备方案

## 日志记录

所有错误都会记录完整的错误信息到日志，包括：
- `errorCode` - PostgreSQL 错误代码
- `errorMessage` - 错误消息
- `errorDetails` - 详细信息
- `errorHint` - 数据库提示
- `fullError` - 完整的错误对象（JSON 格式）

## 示例

### 之前
```
所有错误 → "Database error saving new user"
```

### 现在
```
23505 → "User with this email already exists"
23502 → "Missing required field: password_hash"
23514 → "Data validation failed: users_age_check - new row violates check constraint"
42P01 → "Database table not found. Please contact support."
其他 → "null value in column 'email' violates not-null constraint"
```

## 好处

1. **更好的用户体验** - 用户可以看到具体的错误原因
2. **更容易调试** - 开发者可以根据错误消息快速定位问题
3. **更准确的诊断** - 不同错误类型有不同的处理方式
4. **完整的日志** - 所有错误详情都记录在日志中，便于事后分析

## 测试建议

测试以下场景以确保错误消息正确：

1. **重复邮箱** - 应该显示 "User with this email already exists"
2. **缺失必填字段** - 应该显示 "Missing required field: {字段名}"
3. **数据验证失败** - 应该显示 "Data validation failed: {约束名}"
4. **表/列不存在** - 应该显示相应的支持联系消息
5. **其他数据库错误** - 应该显示原始错误消息
