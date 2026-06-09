FROM node:18

WORKDIR /app

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm install --production=false

# 复制源码并构建
COPY . .
RUN npm run build

# 创建数据目录
RUN mkdir -p data

EXPOSE 3001

CMD ["node", "dist/main.js"]
