# Phase 9 — 部署、CI/CD、文档

> 预估 1-2 天 · 前置: Phase 6 (Web) / Phase 8 (Desktop) · 输出: 上线就绪

## 目标

Web 版部署到 Vercel,桌面版通过 GitHub Releases 分发,所有 PR 跑 CI,tag 触发跨平台构建。

## Checklist

### Vercel 部署(Web)
- [ ] `nuxt.config.ts` 切 SSG: `nitro: { preset: 'vercel-static' }` 或 `'static'`
- [ ] `vercel.json` 关键配置:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
  ```
- [ ] 验证: 部署后 `crossOriginIsolated === true`,FFmpeg 能跑
- [ ] 域名配置(可选): omniconvert.app 或自定义

### `VERCEL_DEPLOYMENT.md`(CLAUDE.md 强制要求)
- [ ] 内容包括:
  - Vercel 项目创建步骤
  - 环境变量清单(对应 `.env.example`)
  - 构建命令: `pnpm install && pnpm generate`
  - 输出目录: `.output/public`
  - COOP/COEP 头注意事项
  - 自定义域名配置
  - 回滚操作

### GitHub Actions

#### `.github/workflows/ci.yml`
- [ ] 触发: PR / push 到 main
- [ ] 步骤: setup pnpm → install → typecheck → lint → test → build(检验)

#### `.github/workflows/release.yml`
- [ ] 触发: tag `v*.*.*`
- [ ] 步骤:
  - 三平台 matrix(macOS / windows-latest / ubuntu-latest)
  - 安装 Tauri 系统依赖
  - `pnpm tauri build`
  - 上传产物到 GitHub Release
- [ ] 用 `tauri-action` 简化

### README 完善
- [ ] 项目介绍 + Logo
- [ ] 截图(主页 + 转换中 + 历史)
- [ ] 安装方式(Web 链接 + 桌面版下载链接)
- [ ] 开发指南(`pnpm install`、`pnpm dev`、`pnpm tauri dev`)
- [ ] 技术栈徽章
- [ ] 贡献指南指向 `CONTRIBUTING.md`(可选)
- [ ] License(MIT 或 Apache-2.0)

### 监控与反馈
- [ ] Sentry 或 自建的最小错误上报(隐私优先,默认关闭,用户主动开启)
- [ ] Plausible / Umami 等隐私友好的访问统计(可选)
- [ ] GitHub Issues 模板:bug 报告、功能请求

### 性能与 SEO
- [ ] Lighthouse 跑分 > 90(性能、可访问性、最佳实践、SEO)
- [ ] OG meta + favicon + 应用图标
- [ ] sitemap.xml(Nuxt SEO 模块)

## 验收标准

1. Vercel 预览链接可用,COOP/COEP 已生效
2. 在 Vercel 上跑端到端: 上传 → 三引擎都能转换 → 下载
3. GitHub Actions CI 在 PR 上跑通
4. 打 tag(如 `v0.1.0`)后自动产出三平台安装包
5. `VERCEL_DEPLOYMENT.md` 完整,新人按文档可在 30 分钟内完成部署
6. README 截图与文档可读

## 风险与备注

- COOP/COEP 头会破坏第三方 iframe 资源(如 YouTube 嵌入),本项目无此场景,但要文档化
- Tauri 在 GitHub Actions 上的 macOS 构建较慢且可能花费配额,关注消耗
- 桌面端代码签名:macOS 需 Apple Developer 账号($99/年),Windows 需 EV 证书(数百美元/年),开源项目可暂跳过,在 README 提示"未签名,需手动信任"
