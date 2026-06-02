# Phase 9 — 部署、CI/CD、文档

> 前置: Phase 6 (Web) / Phase 8 (Desktop) · 输出: 上线就绪

## 目标

Web 版部署到 **腾讯云服务器**，采用 **Docker 打包** 方案，包含 Nginx 反向代理，外网端口 **3000**。同时打包多平台客户端安装包（Windows/macOS/Linux）到镜像中，提供网页下载功能。

---

## Checklist

### Docker 镜像构建

- [ ] **Dockerfile** - 多阶段构建
  - 阶段1: Node 环境构建 Nuxt 应用
  - 阶段2: 构建 Tauri 桌面端（三平台）
  - 阶段3: Nginx 最终镜像，合并所有产物

- [ ] **nginx.conf** - Nginx 配置
  - 监听端口 3000
  - 静态文件服务（Web 应用）
  - `/downloads` 路径提供客户端下载
  - COOP/COEP 头配置（FFmpeg 兼容）
  - Gzip 压缩

- [ ] **.dockerignore** - 排除不需要的文件

- [ ] **docker-compose.yml** (可选) - 方便本地测试

### 客户端打包与集成

- [ ] **Tauri 构建配置**
  - Windows: `.msi`, `.exe` (NSIS)
  - macOS: `.dmg` (x64 + arm64 Universal)
  - Linux: `.AppImage`, `.deb`

- [ ] **下载页面**
  - 路由: `/downloads` 或弹窗
  - 自动检测用户平台，高亮推荐下载
  - 显示版本号、文件大小、SHA256 校验

- [ ] **版本管理**
  - `version.json` 动态生成，包含最新版本信息
  - 客户端检查更新时读取

### 部署文档

- [ ] **`DEPLOYMENT.md`** (必须)
  - Docker 镜像构建步骤
  - 镜像导出/传输到腾讯云
  - 服务器部署命令
  - Nginx 配置说明
  - 更新/回滚流程
  - 故障排查

### CI/CD (GitHub Actions)

- [ ] **`.github/workflows/ci.yml`**
  - 触发: PR / push 到 main
  - 步骤: setup pnpm → install → typecheck → lint → test → build

- [ ] **`.github/workflows/docker-release.yml`**
  - 触发: tag `v*.*.*`
  - 步骤:
    - 构建 Web 应用
    - 三平台矩阵构建 Tauri 客户端
    - 构建 Docker 镜像
    - 导出镜像为 tar 包上传到 Release
    - 推送镜像到 Docker Hub (可选)

### 服务器配置

- [ ] **腾讯云服务器准备**
  - 安装 Docker & Docker Compose
  - 开放端口 3000 (安全组配置)
  - 域名解析 (可选)

- [ ] **SSL/TLS** (可选但推荐)
  - 使用 Nginx 配置 HTTPS
  - 或腾讯云 CLB 负载均衡证书

### README 完善

- [ ] 项目介绍 + Logo
- [ ] 截图(主页 + 转换中 + 历史)
- [ ] 使用方式
  - Web 版: 直接访问链接
  - 桌面版: 下载页面链接
- [ ] 开发指南
- [ ] 技术栈徽章
- [ ] 部署指南链接到 `DEPLOYMENT.md`
- [ ] License

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      腾讯云服务器                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Docker 容器 (Port 3000)                 │   │
│  │                                                     │   │
│  │  ┌──────────────┐    ┌──────────────────────────┐  │   │
│  │  │    Nginx     │───▶│   Nuxt Web 应用 (SSG)    │  │   │
│  │  │   :3000      │    │   /usr/share/nginx/html  │  │   │
│  │  └──────────────┘    └──────────────────────────┘  │   │
│  │         │                                          │   │
│  │         ▼                                          │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │   /downloads (静态文件服务)                   │  │   │
│  │  │   ├── OmniConvert_0.1.0_x64-setup.exe        │  │   │
│  │  │   ├── OmniConvert_0.1.0_x64.dmg              │  │   │
│  │  │   ├── OmniConvert_0.1.0_amd64.AppImage       │  │   │
│  │  │   ├── OmniConvert_0.1.0_amd64.deb            │  │   │
│  │  │   └── version.json                          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    用户访问 :3000
```

---

## 验收标准

1. **Docker 镜像构建成功**
   - `docker build -t omniconvert:latest .` 无错误
   - 镜像包含 Web 应用 + 三平台客户端

2. **本地测试通过**
   - `docker run -p 3000:3000 omniconvert:latest`
   - Web 功能正常，FFmpeg 能跑
   - `/downloads` 能下载客户端

3. **腾讯云部署成功**
   - 服务器上 `docker load` 导入镜像
   - `docker run` 启动服务
   - 外网通过 `http://服务器IP:3000` 访问

4. **CI/CD 完整**
   - 打 tag 后自动构建并上传镜像 tar 包到 Release
   - 镜像版本号与 tag 一致

5. **文档完整**
   - `DEPLOYMENT.md` 包含所有部署步骤
   - 新人按文档可在 30 分钟内完成部署

---

## 文件清单

```
项目根目录/
├── Dockerfile                 # Docker 构建文件
├── .dockerignore             # Docker 忽略文件
├── docker-compose.yml        # (可选) 本地编排
├── nginx.conf                # Nginx 配置
├── DEPLOYMENT.md             # 部署说明文档
├── .github/
│   └── workflows/
│       ├── ci.yml            # CI 工作流
│       └── docker-release.yml # Docker 构建发布
└── src/
    └── pages/
        └── downloads.vue     # 客户端下载页面
```

---

## 风险与备注

- **镜像体积**: 包含三平台客户端后镜像可能较大 (~500MB-1GB)，建议使用多阶段构建优化
- **Tauri 跨平台构建**: Linux 环境下无法直接构建 macOS/Windows 签名版本，CI 中使用矩阵构建
- **COOP/COEP**: 头配置会启用 cross-origin isolation，确保 FFmpeg WASM 正常工作
- **客户端更新**: 首次实现简单下载，后续可添加自动更新功能 (Tauri updater)
