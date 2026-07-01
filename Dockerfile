# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件
COPY package*.json ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# ========== 最终运行镜像 ==========
FROM node:20-alpine AS runner

WORKDIR /app

# standalone 模式只复制必要文件
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 如果有 public 目录则复制（兼容）
COPY --from=builder /app/public* ./public 2>/dev/null || true

# 非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
