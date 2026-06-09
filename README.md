# 特产+日程+地图微信小程序

基于 Taro + React（小程序端）+ NestJS（后端）+ SQLite（数据库）的微信小程序项目。

实现登录 → TabBar(主页/特产/日程/用户) → 特产传地址到地图 → 地图定位展示的完整闭环。

## 原始需求

> 我要用微信小程序为主体的小程序，要求：界面为：主页，特产，日程，用户，登录界面，地图。任务栏：主页，特产，日程，用户。主页：放置一张竖屏的图片覆盖整个界面；特产：多条信息，可向下滑动，每条信息包含图片与文字与一个名为位置的按钮，位置按钮可跳转至地图界面，并且同时发送一个地址向地图界面，地址文本需要可以在程序中修改；地图：接受位置按钮发送的地址，并且使用腾讯地图相关程序定位到该位置并且显示在界面中；日程：需要用图片与文本结合，在程序中预留文本与图片位置；用户：修改按钮昵称、图像，退出登录按键退回至登录界面；登录界面两个输入框，为账号与密码，固定账号和密码即可。一切从简。列出当前要求与条件

---

## How to Run

### 后端启动（Docker）

```bash
# 一键启动
docker compose up
```

### 小程序前端

```bash
# 1. 安装依赖
cd client && pnpm install

# 2. 构建小程序
pnpm build:weapp

# 3. 用微信开发者工具打开 client/dist 目录
```

---

## Services

| 服务     | 地址                                                  |
| -------- | ----------------------------------------------------- |
| 后端 API | http://localhost:3001                                 |
| 特产列表 | GET http://localhost:3001/api/specialties             |
| 日程列表 | GET http://localhost:3001/api/schedules               |
| 用户资料 | GET/PUT http://localhost:3001/api/user/profile        |
| 地理编码 | GET http://localhost:3001/api/map/geocode?address=xxx |

---

## Verification

1. **登录验证**：打开小程序 → 自动跳转登录页 → 输入默认账号和密码 → 登录成功进入主页
2. **主页验证**：主页显示竖屏全屏封面图片
3. **特产验证**：切换到"特产"Tab → 滚动列表（≥6项）→ 每项有图文与"位置"按钮 → 点击"位置"跳转地图页
4. **地图验证**：地图页显示 Marker 定位标记；输入无效地址时显示"地址解析失败"提示，不崩溃
5. **日程验证**：切换到"日程"Tab → 看到时间轴式图文列表（≥6项）
6. **用户验证**：切换到"用户"Tab → 修改昵称保存 → 刷新后昵称仍存在 → 点击退出登录 → 回到登录页

---

## 技术栈

- **前端**：Taro 3.6 + React 18 + TypeScript + SCSS
- **后端**：NestJS 11 + TypeORM + SQLite (sql.js)
- **容器化**：Docker + Docker Compose

## 代码架构

### 1. 前后端分离架构

项目采用经典的 CSR（客户端渲染）架构：

- **Client (Frontend)**: 基于 Taro 框架构建的微信小程序。负责页面交互、数据展示和用户逻辑。通过 RESTful API 与后端通信。
- **Server (Backend)**: 基于 NestJS 构建的 REST API 服务。负责数据持久化、业务逻辑处理（如地理编码）和静态资源托管。

### 2. 模块化设计

后端采用 NestJS 模块化设计，解耦业务逻辑：

- **`AppModule`**: 根模块，聚合所有子模块。
- **`SpecialtiesModule`**: 特产管理（CRUD）。
- **`ScheduleModule`**: 日程管理（CRUD）。
- **`UserModule`**: 用户资料管理。
- **`MapModule`**: 地图服务，集成腾讯地图 WebService API。
- **`CommonModule`**: 包含全局拦截器（TransformInterceptor）和过滤器（HttpExceptionFilter）。

### 3. 数据流向

`Client (Request)` -> `Nginx/Docker Port Mapping` -> `NestJS Controller` -> `Service (Business Logic)` -> `TypeORM (Data Access)` -> `SQLite DB`

## 技术细节

### 1. 静态资源本地化与服务

为确保演示稳定性，避免远程图床 404 或防盗链问题：

- **后端**: 使用 `@nestjs/serve-static` 模块将 `server/public` 目录托管为静态资源服务。
- **前端**: 实现 `resolveImageUrl` 工具函数。不仅支持加载网络图片，还建立映射表（`LOCAL_IMAGE_MAP`）优先加载本地小程序包内的图片，对于动态返回的 `/images` 路径自动拼接 API `BASE_URL`。

### 2. 请求封装与缓存控制

- **拦截器**: 封装 `Taro.request`，统一处理 API 响应结构 (`{ code: 0, data: ... }`) 和网络异常。
- **缓存攻防**: 针对微信小程序环境（特别是开发者工具）的强缓存策略，在 GET 请求中自动追加 `_t=timestamp` 参数，确保获取最新数据。

### 3. 环境配置与端口管理

- **端口迁移**: 为避免与常见 React/Next.js 开发端口冲突，后端服务配置在 **3001** 端口。
- **构建注入**: 利用 Taro 的 `defineConstants` 在编译时将 API 地址注入到前端代码 (`process.env.API_BASE_URL`)，实现开发/生产环境无缝切换。

### 4. Docker 容器化

- 编写 `Dockerfile` 构建 Node.js 运行环境。
- 使用 `docker-compose.yml` 编排服务，映射端口 `3001:3001`，并配置 Healthcheck 确保服务就绪。

## 项目结构

```
label-2367/
├── client/                # Taro + React 小程序前端
│   ├── src/
│   │   ├── pages/         # 6 个页面（login/home/specialties/map/schedule/user）
│   │   ├── services/      # 请求封装
│   │   ├── utils/         # 工具函数（登录态管理）
│   │   └── assets/        # TabBar 图标
│   └── config/            # Taro 构建配置
├── server/                # NestJS 后端
│   ├── src/
│   │   ├── specialties/   # 特产模块
│   │   ├── schedule/      # 日程模块
│   │   ├── user/          # 用户模块
│   │   ├── map/           # 地图模块（腾讯地图 geocode）
│   │   ├── common/        # 统一响应/异常处理
│   │   └── database/      # Seed 数据
│   └── Dockerfile
├── docker-compose.yml     # 一键启动
└── README.md
```

## 登录说明

演示环境下，登录页不会展示默认账号和密码，请使用预设测试账号登录。
