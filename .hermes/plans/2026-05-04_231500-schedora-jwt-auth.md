# Schedora JWT 认证方案

## 方案选型：简单 JWT 登录（方案 B）

Schedora 为个人/小团队物业巡检工具，不需要用户注册/角色/权限系统。采用最简单可行的方案：

- 一个固定账号密码（配置在 appsettings 中）
- `/api/auth/login` 端点验证后返回 JWT token
- 前端存储 token，每次请求带上 Authorization header
- 后端所有业务 Controller 加 `[Authorize]`

## 实施步骤

### 后端改动

1. **安装 NuGet 包**
   - `Microsoft.AspNetCore.Authentication.JwtBearer`

2. **appsettings.json 新增 JWT 配置**
   - Jwt:Secret, Jwt:Issuer, Jwt:Audience, Auth:Credentials

3. **新增 AuthController.cs**
   - POST `/api/auth/login` 接收 username + password
   - 验证后生成 JWT token 返回
   - GET `/api/auth/verify` 验证 token 是否有效

4. **Program.cs 配置 JWT**
   - `AddAuthentication().AddJwtBearer(...)`
   - `UseAuthentication()` 在 `UseAuthorization()` 之前

5. **所有 Controller 加 `[Authorize]`**
   - 除了 `/api/health` 和 `/api/auth/*`

6. **Swagger 配置支持 Bearer token**

### 前端改动

7. **新建 AuthContext.tsx** — token 管理 + 登录状态
8. **新建 LoginPage.tsx** — 登录表单
9. **新建 api.ts** — axios 实例 + token 拦截器
10. **App.tsx 添加路由守卫** — 未登录跳转登录页

## 不改动

- 数据库结构（零改动）
- 现有 Controller 业务逻辑
- Google 同步逻辑
- 前端业务页面

## 验证

- 未登录访问任何 API → 401
- 登录后拿到 token → 正常访问
- token 过期 → 401 → 前端跳转登录页
