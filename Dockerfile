# OmniConvert Docker 构建文件
# 构建命令: docker build -t omniconvert:latest .
# 运行命令: docker run -d -p 3000:3000 --name omniconvert omniconvert:latest

# =============================================================================
# 阶段 1: 构建 Nuxt Web 应用
# =============================================================================
FROM node:20-alpine AS web-builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码 (已通过 .dockerignore 排除不需要的文件)
COPY . .

# 构建 Nuxt 应用 (SSG 静态生成模式)
RUN pnpm generate

# =============================================================================
# 阶段 2: Nginx 最终镜像
# =============================================================================
FROM nginx:1.27-alpine

# 安装健康检查工具
RUN apk add --no-cache curl

# 复制自定义 Nginx 配置 (覆盖默认配置)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 删除 Nginx 默认站点配置，避免冲突
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# 复制构建好的静态文件
COPY --from=web-builder /app/.output/public /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 暴露端口
EXPOSE 3000

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
