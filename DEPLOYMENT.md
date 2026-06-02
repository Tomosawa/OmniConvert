# OmniConvert 部署指南

> 本文档指导如何将 OmniConvert 部署到腾讯云服务器，使用 Docker 镜像方式。

## 部署架构

```
腾讯云服务器
├── Docker 容器 (Port 3000)
│   ├── Nginx (反向代理 + 静态文件服务)
│   ├── Nuxt Web 应用 (SSG 静态页面)
│   └── /downloads (客户端安装包下载)
│       ├── OmniConvert_0.1.0_x64-setup.exe (Windows)
│       ├── OmniConvert_0.1.0_x64.dmg (macOS)
│       ├── OmniConvert_0.1.0_amd64.AppImage (Linux)
│       └── version.json (版本信息)
└── 安全组: 开放 TCP 3000 端口
```

---

## 前置要求

### 本地构建环境
- Docker Desktop (Windows/macOS) 或 Docker Engine (Linux)
- 至少 4GB 可用内存
- 约 2GB 磁盘空间

### 腾讯云服务器
- 操作系统: Ubuntu 20.04/22.04 LTS 或 CentOS 7/8
- 配置: 建议 2核4G 及以上
- 带宽: 建议 5Mbps 及以上（客户端安装包较大）
- 安全组: 需要开放 **3000** 端口

---

## 快速部署流程

### 1. 本地构建 Docker 镜像

```bash
# 进入项目目录
cd /path/to/OmniConvert

# 构建 Docker 镜像
docker build -t omniconvert:latest .

# 验证镜像构建成功
docker images | grep omniconvert
```

### 2. 导出 Docker 镜像

```bash
# 导出镜像为 tar 文件
docker save -o omniconvert-latest.tar omniconvert:latest

# 压缩镜像文件（推荐，可减小 50%+ 体积）
gzip omniconvert-latest.tar
# 输出: omniconvert-latest.tar.gz
```

### 3. 传输镜像到腾讯云服务器

**方式一: 使用 scp (推荐)**

```bash
# 上传压缩后的镜像到服务器
scp omniconvert-latest.tar.gz root@你的服务器IP:/root/

# 示例
scp omniconvert-latest.tar.gz root@123.45.67.89:/root/
```

**方式二: 使用 rsync (断点续传，适合大文件)**

```bash
rsync -avz --progress omniconvert-latest.tar.gz root@你的服务器IP:/root/
```

**方式三: 通过对象存储中转**

如果镜像很大或网络不稳定：
1. 上传到腾讯云 COS
2. 在服务器上使用 `wget` 或 `curl` 下载

```bash
# 服务器上下载
curl -O "https://your-bucket.cos.ap-beijing.myqcloud.com/omniconvert-latest.tar.gz"
```

---

## 服务器部署步骤

### 1. 登录服务器并安装 Docker

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 安装 Docker (Ubuntu/Debian)
apt-get update
apt-get install -y docker.io docker-compose

# 或安装 Docker (CentOS)
yum install -y docker docker-compose
systemctl start docker
systemctl enable docker

# 验证 Docker 安装
docker --version
```

### 2. 导入 Docker 镜像

```bash
# 进入镜像文件所在目录
cd /root

# 如果是压缩文件，先解压
gunzip omniconvert-latest.tar.gz

# 导入 Docker 镜像
docker load -i omniconvert-latest.tar

# 验证镜像已导入
docker images | grep omniconvert
```

### 3. 启动服务

```bash
# 运行容器
docker run -d \
  --name omniconvert \
  -p 3000:3000 \
  --restart unless-stopped \
  omniconvert:latest

# 查看容器状态
docker ps | grep omniconvert

# 查看日志
docker logs -f omniconvert
```

### 4. 验证部署

```bash
# 本地测试 (服务器上)
curl http://localhost:3000/health
# 应返回: healthy

# 检查 Web 页面
curl -I http://localhost:3000
```

浏览器访问: `http://你的服务器IP:3000`

---

## 配置客户端下载

### 准备客户端安装包

在构建镜像前，需要将 Tauri 构建的客户端安装包放到指定位置：

```bash
# 项目目录结构
OmniConvert/
├── Dockerfile
├── downloads/                    # 创建此目录存放客户端
│   ├── OmniConvert_0.1.0_x64-setup.exe      # Windows
│   ├── OmniConvert_0.1.0_x64.dmg            # macOS Intel
│   ├── OmniConvert_0.1.0_aarch64.dmg        # macOS Apple Silicon
│   ├── OmniConvert_0.1.0_amd64.AppImage     # Linux AppImage
│   ├── OmniConvert_0.1.0_amd64.deb          # Linux Deb
│   └── version.json                         # 版本信息
└── ...
```

### version.json 格式

```json
{
  "version": "0.1.0",
  "buildTime": "2024-01-15T10:30:00Z",
  "downloads": {
    "windows": {
      "url": "/downloads/OmniConvert_0.1.0_x64-setup.exe",
      "size": 52428800,
      "sha256": "abc123..."
    },
    "macos": {
      "url": "/downloads/OmniConvert_0.1.0_x64.dmg",
      "size": 62914560,
      "sha256": "def456..."
    },
    "linux": {
      "url": "/downloads/OmniConvert_0.1.0_amd64.AppImage",
      "size": 47185920,
      "sha256": "ghi789..."
    }
  }
}
```

### 更新 Dockerfile 复制客户端

修改 Dockerfile，添加客户端复制步骤：

```dockerfile
# 在阶段 2 中添加
COPY downloads/ /usr/share/nginx/html/downloads/
```

---

## 常用运维命令

### 容器管理

```bash
# 停止服务
docker stop omniconvert

# 启动服务
docker start omniconvert

# 重启服务
docker restart omniconvert

# 查看日志
docker logs omniconvert
docker logs -f omniconvert  # 实时日志

# 进入容器内部
docker exec -it omniconvert sh

# 删除容器
docker rm -f omniconvert
```

### 更新部署

```bash
# 1. 备份旧版本
docker tag omniconvert:latest omniconvert:backup

# 2. 停止旧容器
docker stop omniconvert
docker rm omniconvert

# 3. 导入新镜像
docker load -i omniconvert-new.tar

# 4. 启动新容器
docker run -d \
  --name omniconvert \
  -p 3000:3000 \
  --restart unless-stopped \
  omniconvert:latest

# 5. 验证正常后删除备份
docker rmi omniconvert:backup
```

### 回滚

```bash
# 如果新版本有问题，快速回滚
docker stop omniconvert
docker rm omniconvert
docker tag omniconvert:backup omniconvert:latest
docker run -d \
  --name omniconvert \
  -p 3000:3000 \
  --restart unless-stopped \
  omniconvert:latest
```

---

## 腾讯云安全组配置

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云服务器 CVM** → **安全组**
3. 选择服务器关联的安全组，点击 **修改规则**
4. 添加 **入站规则**：

| 协议 | 端口 | 源IP | 策略 |
|------|------|------|------|
| TCP | 3000 | 0.0.0.0/0 | 允许 |

> **注意**: `0.0.0.0/0` 表示允许所有 IP 访问。生产环境建议限制为特定 IP 段。

---

## 配置域名和 HTTPS (可选)

### 使用腾讯云 CLB (负载均衡)

1. 创建应用型负载均衡
2. 配置监听：HTTP 80 → 转发到 3000
3. 配置 HTTPS 443 (需要上传 SSL 证书)
4. 绑定域名解析到 CLB IP

### 使用 Nginx 反向代理 (服务器上)

如果需要在服务器上配置 HTTPS：

```bash
# 服务器上安装 Nginx
apt-get install -y nginx

# 申请 Let's Encrypt 证书
certbot --nginx -d your-domain.com

# 配置反向代理到 Docker 容器
```

`/etc/nginx/sites-available/omniconvert`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker logs omniconvert

# 检查端口占用
netstat -tlnp | grep 3000

# 强制删除并重建
docker rm -f omniconvert
docker run -d --name omniconvert -p 3000:3000 omniconvert:latest
```

### 无法访问 Web 页面

1. **检查安全组**: 确认 3000 端口已开放
2. **检查防火墙**:
   ```bash
   # Ubuntu/Debian
   ufw status
   ufw allow 3000/tcp

   # CentOS
   firewall-cmd --list-ports
   firewall-cmd --add-port=3000/tcp --permanent
   firewall-cmd --reload
   ```
3. **检查容器状态**:
   ```bash
   docker ps -a
   docker inspect omniconvert
   ```

### 客户端下载失败

```bash
# 进入容器检查文件
docker exec -it omniconvert sh
ls -la /usr/share/nginx/html/downloads/

# 检查 Nginx 配置
cat /etc/nginx/conf.d/default.conf

# 重启 Nginx (容器内)
docker exec omniconvert nginx -s reload
```

### 镜像导入失败

```bash
# 检查镜像文件完整性
file omniconvert-latest.tar

# 重新导出并传输
docker save -o omniconvert-latest.tar omniconvert:latest
gzip omniconvert-latest.tar
# 重新传输...
```

---

## CI/CD 自动化部署 (GitHub Actions)

项目已配置 GitHub Actions 工作流，打 tag 后自动：

1. 构建 Web 应用
2. 构建三平台 Tauri 客户端
3. 构建 Docker 镜像
4. 导出镜像并上传到 GitHub Release

### 使用 CI 构建的镜像部署

```bash
# 1. 下载 Release 中的镜像文件
wget https://github.com/yourusername/omniconvert/releases/download/v0.1.0/omniconvert-v0.1.0.tar.gz

# 2. 上传到服务器并导入
docker load -i omniconvert-v0.1.0.tar.gz

# 3. 启动
docker run -d --name omniconvert -p 3000:3000 omniconvert:v0.1.0
```

---

## 性能优化建议

### 镜像体积优化

1. 使用多阶段构建 (已在 Dockerfile 中实现)
2. 使用 Alpine 基础镜像 (已使用 `nginx:alpine`)
3. 客户端安装包单独存储，不打包进镜像

### 运行时优化

```bash
# 限制容器资源 (根据服务器配置调整)
docker run -d \
  --name omniconvert \
  -p 3000:3000 \
  --memory=512m \
  --cpus=1 \
  --restart unless-stopped \
  omniconvert:latest
```

### CDN 加速 (推荐)

客户端安装包较大，建议使用腾讯云 CDN：

1. 将 `downloads/` 目录放到 COS 对象存储
2. 配置 CDN 加速域名
3. Web 页面中的下载链接指向 CDN 域名

---

## 联系与支持

- GitHub Issues: [项目地址]/issues
- 部署问题请在 Issue 中标记 `deployment` 标签

---

**最后更新**: 2024-01-15
