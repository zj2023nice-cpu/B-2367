# 特产日程 — 服务端

特产日程项目的 NestJS 后端，提供特产 CRUD、日程管理、用户资料、地图地理编码与总览统计等 REST API。数据库使用 SQL.js（SQLite 的纯 JS 实现），需配置必填环境变量后方可启动。

## 目录结构

```
server/
├── src/
│   ├── common/
│   │   ├── config-validation.ts   # 环境变量启动校验
│   │   ├── filters/               # 全局异常过滤器
│   │   └── interceptors/          # 全局响应拦截器
│   ├── database/
│   │   ├── seed.ts                # Seed 数据初始化与旧数据自动修复
│   │   └── seed.spec.ts
│   ├── map/                       # 腾讯地图地理编码服务
│   ├── overview/                  # 首页总览统计
│   ├── schedule/                  # 日程管理
│   ├── specialties/               # 特产管理
│   ├── user/                      # 用户资料
│   ├── app.module.ts
│   └── main.ts
├── public/images/                 # 静态图片资源
├── data/                          # SQLite 数据库文件（运行时生成）
├── .env.example                   # 环境变量示例
├── .env                           # 本地环境变量（不提交）
└── Dockerfile
```

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填写以下必填项：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `TENCENT_MAP_KEY` | **是** | — | 腾讯地图 WebService API Key。缺失或为占位值时服务无法启动 |
| `PORT` | **是** | — | 服务监听端口，1–65535 整数。缺失时服务无法启动 |
| `DB_PATH` | **是** | — | SQLite 数据库文件路径，相对于 server 根目录。缺失时服务无法启动 |
| `CORS_ORIGIN` | 否 | 允许所有来源 | 跨域允许的 origin，生产环境建议设置 |

> 腾讯地图 Key 申请地址：<https://lbs.qq.com/dev/console/application/mine>

### 3. 启动开发服务

```bash
npm run start:dev
```

首次启动会自动执行 Seed 初始化（见下方 Seed 行为说明）。

### 4. 生产构建

```bash
npm run build
npm run start:prod
```

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `npm run start:dev` | 开发模式，文件变更自动重启 |
| `npm run start` | 普通启动（需先 build） |
| `npm run start:prod` | 生产模式（运行 `dist/main.js`） |
| `npm run build` | 编译 TypeScript 到 `dist/` |
| `npm run test` | 运行单元测试 |
| `npm run test:e2e` | 运行端到端测试 |
| `npm run lint` | ESLint 检查并自动修复 |
| `npm run format` | Prettier 格式化 |

## API 路由一览

| 模块 | 路由 | 说明 |
|------|------|------|
| 特产 | `GET /api/specialties` | 列表查询（支持 `region` 筛选） |
| 特产 | `PUT /api/specialties/:id/address` | 更新特产地址 |
| 日程 | `GET /api/schedules` | 列表查询（支持 `filter=completed/pending`） |
| 日程 | `GET /api/schedules/stats` | 日程完成统计 |
| 日程 | `PUT /api/schedules/:id/complete` | 标记完成 |
| 日程 | `PUT /api/schedules/:id/undo` | 撤销完成 |
| 用户 | `GET /api/user/profile` | 获取用户资料 |
| 用户 | `PUT /api/user/profile` | 更新用户资料 |
| 用户 | `POST /api/user/profile/reset` | 恢复默认资料 |
| 地图 | `GET /api/map/geocode?address=xxx` | 单条地理编码 |
| 地图 | `POST /api/map/geocode/batch` | 批量地理编码 |
| 总览 | `GET /api/overview` | 首页统计数据 |

## Seed 行为

服务每次启动时自动运行 `seedDatabase()`，逻辑如下：

1. **特产 Seed**：表为空时插入 8 条默认特产数据；为历史无 `region` 字段的记录自动补全
2. **日程 Seed**：表为空时插入 7 条默认日程；若检测到旧版占位数据或通用默认数据（如标题为"抵达目的地""城市地标游览"等），自动清除并替换为新默认数据；为旧日程补全 `completed` 字段
3. **用户资料 Seed**：表为空时插入默认游客资料（nickname: 游客）

> **注意**：Seed 仅在数据为空或检测到旧数据时执行，不会覆盖已有正常数据。如需重置，删除 `data/app.db` 后重启服务即可。

## 地图 Key 说明

- 地理编码使用腾讯位置服务 WebService API
- `TENCENT_MAP_KEY` 在 `.env` 中配置，**为必填项**
- 缺失或值为占位值（如 `YOUR_KEY_HERE`）时，服务启动直接失败
- Key 配额限制请查看腾讯地图控制台
- 批量地理编码默认并发数为 4，可在 `MapService.batchGeocode()` 中调整

## 数据库

- 类型：SQL.js（SQLite 的 WebAssembly/纯 JS 实现）
- 位置：由必填环境变量 `DB_PATH` 控制，示例值 `data/app.db`
- `synchronize: true`：Entity 变更自动同步表结构（开发便利，生产环境慎用）
- 数据库文件在 `server/.gitignore` 中被忽略，不会提交到仓库
- Docker 部署时通过 volume 持久化数据（见 `docker-compose.yml`）

## 环境变量校验

服务启动时通过 `ConfigModule.forRoot({ validate })` 执行环境变量校验，校验失败则直接阻止启动：

- **`TENCENT_MAP_KEY`**：必填，缺失或为占位值（`YOUR_KEY_HERE` 等）时启动失败
- **`PORT`**：必填，缺失或不为 1–65535 整数时启动失败
- **`DB_PATH`**：必填，缺失或为占位值时启动失败
- **`CORS_ORIGIN`**：可选，留空则允许所有来源
- 校验失败时错误信息会提示「请复制 `.env.example` 为 `.env` 并按提示填写」

## Docker 部署

```bash
# 根目录下
docker compose up -d
```

- 端口映射 `3001:3001`
- 数据持久化到 Docker volume `server-data`
- 环境变量通过 `server/.env` 注入
- 健康检查：每 30s 请求 `/api/specialties`

## 已知限制

1. **数据库单写**：SQL.js 不支持多进程并发写入，适合单实例部署
2. **Seed 不可定制**：默认数据硬编码在 `seed.ts` 中，无法通过配置文件覆盖
3. **无鉴权**：用户接口无登录鉴权，`X-Token` 仅做客户端标识
4. **地图 API 限流**：腾讯地图免费配额有限，批量地理编码需注意调用量
5. **CORS 默认全开**：不设置 `CORS_ORIGIN` 时允许所有来源，生产环境需收紧

## 常见排错

| 现象 | 可能原因 | 解决方式 |
|------|----------|----------|
| 启动报错 `环境变量校验失败` | PORT / TENCENT_MAP_KEY / DB_PATH 等必填项缺失或为占位值 | 检查 `.env` 文件，对照 `.env.example` 修正，确保三项均填写有效值 |
| geocode 接口返回 500 | `TENCENT_MAP_KEY` 无效或配额耗尽 | 检查 Key 是否正确，查看腾讯地图控制台配额 |
| 日志显示 `腾讯地图 API 错误` | Key 无效或配额耗尽 | 检查 Key 是否正确，查看腾讯地图控制台配额 |
| 数据库文件不存在 | 首次运行 | 正常现象，启动时自动创建 `data/app.db` |
| 旧日程数据未更新 | Seed 仅处理空表或旧格式数据 | 删除 `data/app.db` 重启，或手动通过 API 修改 |
| Docker 容器重启丢数据 | 未挂载 volume | 确认 `docker-compose.yml` 中 `server-data` volume 配置正确 |
| CORS 预检失败 | 浏览器 H5 调试跨域被拒 | 开发时无需设置；生产环境在 `.env` 中配置 `CORS_ORIGIN` |
