# Nexus-Mail 完整开发计划（todo.md）

> **执行模式已切换：** 本文档不再只是规划稿，而是当前仓库的**执行中路线图**。后续提交必须对照阶段目标更新状态，并在阶段完成后进入下一阶段。

## 执行状态看板（持续维护）

### 当前总体进度
- Phase 0：**已完成**（开发底座、Docker、多服务骨架已提交）
- Phase 1：**已完成**（身份权限、共享控制台骨架已提交）
- Phase 2：**已完成**（项目/库存/激活订单主链路、管理员项目配置、供应商资源录入已提交）
- Phase 3：**已完成**（已完成 SMTP 会话落盘、metadata 入库、RabbitMQ 解析任务入队、MinIO 原始对象上传，并打通验证码/link 提取回退增强、订单 READY/FINISHED 自动迁移、真实 OAuth2 刷新接入、授权码/App Password/密码型凭证录入与健康状态落库、`env://` secret_ref 解析、IMAP/POP3 实际登录校验、官方邮箱端点限制、Proton Bridge 接入策略与 Postfix 转发样例）
- Phase 4：进行中（已完成用户钱包、冻结余额、成功扣费、超时退款、供应商待结算余额、管理员调账能力与基础结算页面；本轮新增管理员供应商待结算确认：`POST /api/v1/admin/supplier-settlements` 可将供应商 pending 结算流水原子标记为 settled，并将待结算余额迁移到已结算余额，写入 `settle_supplier_pending` 审计且纳入管理员审计过滤与 OpenAPI/前端入口；本轮补强供应商报表筛选：`GET /api/v1/supplier/reports` 支持 `from/to/limit`，服务端校验日期与上限、前端显式查询、OpenAPI 文档与真实 API/索引验证已完成；本轮交付供应商供货规则维护：新增供应商自有 `GET/POST /api/v1/supplier/resources/offerings`、供货规则页面与侧边栏入口，支持按项目/域名池维护售价、成功率、优先级和来源类型，列表按当前供应商隔离，真实 API 验证 400/200/403 与库存反映已完成；本轮补强管理员争议单处理体验：争议单列表支持显式 `status/limit` 查询草稿，避免输入变化触发请求风暴，并通过真实 API 验证 open/resolved 过滤、limit 与非法状态 400；下一步重点：报表继续完善）
- Phase 5：进行中（已接入 OpenAPI 3 初始规范文件与 `/docs` Redoc 页面；已补齐管理员 `/api/v1/admin/audit` 审计查询接口，可基于真实 API 回放查询 API Key 生命周期与鉴权事件；已交付管理员 `/api/v1/admin/overview` 真实聚合概览、`/api/v1/admin/risk` 风险信号汇总，以及前端管理端风控/审计/仪表盘真实数据页面；已补强 API Key 创建默认最小权限：省略 scopes 时默认 `activation:read`、显式空白 scopes 拒绝，并通过真实 API Key 创建/使用/撤销回放验证；已交付 API Key IP 白名单管理里程碑：支持 `PATCH /api/v1/auth/api-keys/:id/whitelist` 更新白名单、规范化 IP/CIDR、写入 `update_whitelist` 审计并可由管理员审计接口筛选，已通过真实 API 回放验证更新前 403、更新后 200；已交付 API Key 运行时限流首个里程碑：同一 API Key 每分钟 60 次后返回 429 并写入 `denied_rate_limit` 审计；本轮补强为 Redis 全局计数限流，API 启动时连接 `REDIS_URL` 并使用 Lua 原子 `INCR` + `PEXPIRE` + TTL 修复，按稳定 API Key ID 计数并哈希 Redis key，支持独立限流超时、Redis 连接池/读写超时配置、`/healthz` Redis readiness，后端故障脱敏返回 503 并记录 `rate_limit_backend_error` 审计；真实 API 连续 70 次请求验证 60 次 200、10 次 429、Redis key 带 TTL、`/healthz` 返回 `redis=ok`、管理员审计可查询 `denied_rate_limit` 与 `rate_limit_backend_error`；已交付 API Key 商业下单写权限入口：新增 `POST /api/v1/orders/activations/api-key`，仅接受包含 `activation:write` scope 的 API Key，复用白名单/限流/审计链路并补充 OpenAPI `apiKeyAuth` 文档，真实 API 验证 read-only 403、write-scope 201 创建订单；已交付 Webhook 配置、重试可观测性与异步真实投递里程碑：用户鉴权下 endpoint 创建/列表、一次性签名 secret、secret_preview 列表脱敏、SSRF URL 拦截、test-delivery 创建 pending delivery 并由独立 webhook-worker 异步真实 POST，携带 HMAC-SHA256 签名，2xx 标记 sent，失败按指数退避重试并支持陈旧锁回收，同时新增 `GET /api/v1/webhooks/endpoints/:id/deliveries` 查询当前用户 endpoint 的最近投递/重试记录；已交付可配置风控规则首个里程碑：新增 `GET/PUT /api/v1/admin/risk/rules`、`risk_rules` schema/default seed、前端风控规则表格编辑、`update_risk_rule` 管理员审计、OpenAPI 文档，并通过真实 API 验证默认规则、非法阈值 400、更新后持久化；本轮补强风控规则运行时生效：`/api/v1/admin/risk` 会实时读取 `risk_rules` 的 enabled/threshold/severity 来过滤与标记风险信号，前端保存规则后自动刷新风险信号，OpenAPI 补齐 AdminRiskResponse 契约，真实 API 已验证规则更新后风险接口仍返回配置驱动的有效信号；本轮补强仪表盘深度统计：管理员 overview 增加订单完成/超时/取消率、完成订单流水、平均完成客单价、争议发生率、鉴权拒绝总数/拒绝率，并在前端仪表盘展示，已通过真实 API 验证新增字段存在；本轮补强财务运营审计闭环：成本模型更新、管理员调账、争议处理分别写入 `update_supplier_cost_profile`、`admin_wallet_adjustment`、`resolve_dispute` 审计并纳入管理员过滤与 OpenAPI 文档，已通过真实 API 查询验证；本轮交付发件人黑名单风控闭环：新增管理员 `GET/PUT /api/v1/admin/risk/sender-blacklist` 批量 upsert，支持 email/domain/`*.domain` 规范化与非法邮箱 400，写入 `update_sender_blacklist` 审计；mail-ingest 在 SMTP DATA 前实时评估黑名单并以 554 拒收命中发件人，同时写入 `sender_blacklist_hit` 系统审计且不因审计失败放宽拦截；`/api/v1/admin/risk` 暴露 `sender_blacklist_hits` 并按 `sender_blacklist` 规则生成“发件人黑名单命中”风险信号；OpenAPI 已补齐管理、审计与风险契约，真实 API/SMTP 回放验证非法更新 400、命中发件人 554、允许发件人 250 Queued、审计与风控信号可查询）
- Phase 6：未开始

### 本机环境现状（2026-04-13 更新）
- `go version`：可用
- `docker version`：可用
- `docker compose version`：可用
- `pnpm -v`：可用
- 本机已验证可绑定 **25 端口**

### 本地参考资料
- 已在项目目录放置竞品调研参考：`docs/reference-local/luckyous-reference.md`
- 该目录已加入本地 Git 排除规则，**仅作为本机开发参考，不推送远程仓库**

## 0. 项目目标

构建一个面向商业化运营的 **邮件接码平台**，核心产品逻辑对齐成熟 **SIM 接码平台**，但资源从“手机号 / 号码池”切换为“域名 / 邮箱别名 / 邮件接收能力”。

### 明确目标
- 后端：**Go**
- 前端：**React**
- 数据存储：
  - 高性能持久存储：**PostgreSQL**
  - 缓存数据库：**Redis**
- 编译与部署：**必须使用 Docker**
- UI 风格：参考 **QuantumNous/new-api**
- 权限模型：**同一套系统页面 + 同一套布局骨架**，仅通过菜单和路由权限扩展区分用户 / 供应商 / 管理员，逻辑对齐 new-api 的共享控制台模式
- 单独页面：必须提供 **API 文档页面**
- 商业目标规模：
  - 注册用户：**1 万+**
  - 并发：**1000+**

---

## 1. 已完成调研结论（用于本计划）

## 1.1 new-api UI / 权限模式结论
基于公开资料调研，`new-api` 的前端特征可提炼为：

- 使用 **React + Vite**
- UI 组件偏向 **Semi Design (`@douyinfe/semi-ui`)** 风格
- 采用 **单一共享控制台布局**：侧边栏 + 顶栏 + 内容区
- 非“用户端 / 管理端”双前端拆分，而是在 **同一前端壳** 中按角色决定可见菜单与路由
- 管理员角色通过菜单项追加、路由守卫与权限控制显示更多能力

### 对 Nexus-Mail 的直接落地要求
- 只维护 **一个 React 控制台项目**，不拆成三个独立后台
- 通过角色与权限声明控制菜单：
  - 普通用户菜单
  - 供应商扩展菜单
  - 管理员扩展菜单
- 所有角色共享相同 Layout：
  - `Sidebar`
  - `Topbar`
  - `Content`
  - `Breadcrumb`
  - `GlobalNotice / Toast`
- 严禁做三套皮肤逻辑分叉；差异应体现在：
  - 菜单树
  - 页面权限
  - 页面中局部操作按钮

---

## 1.2 架构与中间件调研结论
结合商业项目目标与 1000+ 并发要求，推荐基础设施：

### 核心推荐
- **Go 后端**：高并发 API 与异步处理主服务
- **PostgreSQL**：主业务数据库，系统唯一事实源（system of record）
- **PgBouncer**：PostgreSQL 连接池层，避免高并发直接打爆数据库连接
- **Redis**：缓存、会话、限流、幂等键、短生命周期状态
- **RabbitMQ（Quorum Queues）**：可靠异步任务队列
- **MinIO**：原始邮件 MIME、附件、审计快照等对象存储
- **OpenAPI + Redoc**：单独 API 文档页面
- **Postfix**：公网 25 端口 SMTP 接收边缘
- **Go Mail Processor**：在 Postfix 后方做业务解析，而不是直接把 Go API 暴露成公网 SMTP 第一跳

### 主流邮箱供应商接入结论
供应商资源不能只局限于“自建域名邮箱”，还必须纳入主流公网邮箱与商业邮箱账号池。规划上应支持：

- 自建域名 / 自建邮局
- Google 体系：Gmail、Google Workspace
- Microsoft 体系：Outlook.com、Hotmail、Live、Microsoft 365
- Apple：iCloud Mail
- Yahoo 体系：Yahoo Mail、AOL Mail
- 中国公网邮箱：QQ 邮箱、163 邮箱、126 邮箱、yeah 邮箱
- 商业邮箱：Zoho Mail、Fastmail、Yandex Mail、GMX、Mail.com
- 特殊邮箱：Proton Mail（通过 Proton Bridge）

### 接入方式结论
系统设计上必须原生支持以下授权 / 协议模式：
- `MX / SMTP inbound`
- `IMAP pull`
- `POP3 pull`
- `OAuth2`
- `App Password`
- `授权码`
- `Bridge / 本地代理`

### 统一资源建模结论
为了避免后续实现混乱，必须统一采用以下分类：
- `source_type`
  - `self_hosted_domain`
  - `hosted_mailbox`
  - `public_mailbox_account`
  - `bridge_mailbox`
- `auth_mode`
  - `password`
  - `oauth2`
  - `app_password`
  - `authorization_code`
  - `bridge_local_credential`
- `protocol_mode`
  - `smtp_inbound`
  - `imap_pull`
  - `pop3_pull`

### provider 映射示例
- Gmail / Google Workspace：`public_mailbox_account` 或 `hosted_mailbox` + `oauth2` / `app_password` + `imap_pull`
- Outlook / Hotmail / Live / Microsoft 365：`public_mailbox_account` 或 `hosted_mailbox` + `oauth2` / `app_password` + `imap_pull`
- QQ / 163 / 126 / yeah：`public_mailbox_account` + `authorization_code` + `imap_pull` 或 `pop3_pull`
- iCloud：`public_mailbox_account` + `app_password` + `imap_pull`
- Proton：`bridge_mailbox` + `bridge_local_credential` + `imap_pull`

设计原则：
- 优先支持 IMAP，其次 POP3
- Gmail / Outlook / Microsoft 365 优先 OAuth2
- QQ / 163 / 126 / yeah 必须把授权码作为一等能力
- Proton 必须单独建模为 Bridge 类资源

### 为什么不是“Go 直接监听公网 25 端口”
虽然本机已经验证可绑定 25 端口，但商业生产环境中：
- SMTP 接收涉及协议兼容
- 重试/排队/退信/灰度处理复杂
- 反垃圾、限流、TLS、MTA 行为必须稳定

因此建议架构是：

```text
Internet MX
  -> Postfix (25)
  -> internal filter / LMTP / webhook bridge
  -> Go mail-ingest service
  -> RabbitMQ
  -> parsing workers
  -> PostgreSQL / Redis / MinIO
```

这是最稳妥、最适合商业长期维护的方案。

---

## 2. 最终技术选型（定稿建议）

## 2.1 后端
### 语言与框架
- 语言：**Go 1.23+ / 1.24+**（正式落地时选稳定版本）
- Web 框架：**Gin** 或 **Echo**
  - 推荐：**Gin**
  - 原因：社区成熟、资料多、适合商业 API 后台

### Go 子模块建议
- `cmd/api`：HTTP API 服务
- `cmd/worker`：异步任务消费者
- `cmd/mail-ingest`：邮件接收后的业务摄取服务
- `cmd/scheduler`：定时任务 / 超时单 / 清理任务

### 核心 Go 依赖建议
- Web：`gin-gonic/gin`
- ORM / SQL：**`sqlc` + `pgx`** 或 **GORM**
  - 推荐：商业项目优先 **`sqlc + pgx`**，更可控、更稳定、更适合高并发
- 配置：`spf13/viper` 或纯环境变量 + 自定义 config loader
- 日志：`uber-go/zap`
- 校验：`go-playground/validator`
- JWT：`golang-jwt/jwt`
- OpenAPI：`swaggo/swag` 或 contract-first OpenAPI 生成
  - 推荐：一期先 `swaggo`，二期收敛成 contract-first
- 队列：RabbitMQ 官方/成熟客户端
- 邮件协议：`emersion/go-smtp`（用于内部组件，不建议替代公网 MTA）

---

## 2.2 前端
### 框架
- **React 18**
- **Vite**
- **TypeScript**（必须）

### UI 方案
为了最大程度贴近 new-api 风格，推荐：
- **Semi Design** 作为主 UI 库
- `react-router-dom`
- `zustand` 或 `redux-toolkit`
  - 推荐：**zustand**，更轻量
- 表单：`react-hook-form`
- 图表：`@visactor/react-vchart` 或 `echarts-for-react`
  - 推荐：贴近 new-api 可选 `VChart`
- 请求层：`axios`

### 前端权限模式
- 单一应用：`web/`
- 单一 Layout：`ConsoleLayout`
- 角色：
  - `user`
  - `supplier`
  - `admin`
- 菜单策略：
  - 基础菜单：所有角色共享
  - 供应商菜单：追加显示
  - 管理员菜单：追加显示
- 路由策略：
  - `ProtectedRoute`
  - `SupplierRoute`
  - `AdminRoute`
- 不允许复制页面壳，只允许扩展模块

---

## 2.3 数据与中间件
### 持久数据库
**PostgreSQL**

用于保存：
- 用户
- 供应商
- 项目
- 域名
- 邮箱池
- 第三方邮箱账号池
- 邮箱协议配置
- OAuth / 授权码 / App Password / Bridge 凭证引用
- 订单
- 邮件元数据
- 提取结果
- 钱包交易
- 退款记录
- 审计日志
- 风控事件

### 缓存数据库
**Redis**

用于保存：
- 登录会话 / token 黑名单
- 限流计数器
- 幂等键
- 短生命周期订单状态缓存
- 热门价格 / 库存缓存
- Webhook 重试状态
- 临时验证码读取窗口

### 队列系统
**RabbitMQ（Quorum Queues）**

用于：
- 入站邮件处理任务
- 提取任务
- Webhook 投递任务
- 退款异步处理
- 供应商结算任务
- 统计聚合任务

### 对象存储
**MinIO**

用于：
- 原始 MIME 邮件
- HTML 原文
- 附件
- 邮件快照
- 审计归档

---

## 3. 部署拓扑（单机商业起步版）

本项目初期以 **单台机器 Docker Compose** 启动，后续平滑升级为多机。

## 3.1 单机生产拓扑

```text
[Internet]
   |
   |-- 80/443 --> Nginx / Caddy
   |                |-- React Web
   |                |-- Go API
   |                |-- /docs -> Redoc
   |
   |-- 25 --> Postfix
                    |-- internal handoff -> mail-ingest

[Docker services]
- gateway (Nginx/Caddy)
- api (Go)
- worker (Go)
- scheduler (Go)
- mail-ingest (Go)
- postgres
- pgbouncer
- redis
- rabbitmq
- minio
- postfix (host or containerized with stronger host networking strategy)
- prometheus
- grafana
- loki / promtail（可选）
```

## 3.2 重要部署原则
- **数据库、Redis、RabbitMQ、MinIO 必须有持久卷**
- 所有服务必须通过 Docker 构建
- 生产镜像必须使用 **multi-stage Dockerfile**
- API 与前端必须通过反向代理统一暴露
- API 文档页必须从正式环境可访问：`/docs`
- 管理后台不能单独域名拆新项目；应继续复用同一套前端

---

## 4. 本机环境准备任务（必须先做）

> 当前机器已验证：**可绑定 25 端口**。

但当前机器还缺少开发关键依赖：
- `go`：未安装
- `docker`：未安装
- `pnpm`：未安装

## Task 0：开发机初始化

### 目标
让这台机器成为 Nexus-Mail 的长期开发与部署机器。

### 必做事项
- 安装 Go
- 安装 Docker Engine + Docker Compose Plugin
- 安装 pnpm
- 安装 Make
- 安装 Git LFS（如果后续文档/资产需要）
- 安装 `swag` / `sqlc` / `golangci-lint`
- 安装 `psql` / `redis-cli` / `rabbitmqadmin`（可选）

### 验证标准
- `go version` 可用
- `docker version` 可用
- `docker compose version` 可用
- `pnpm -v` 可用
- `docker run hello-world` 成功

---

## 5. 项目目录结构（目标结构）

```text
nexus-mail/
├── cmd/
│   ├── api/
│   ├── worker/
│   ├── scheduler/
│   └── mail-ingest/
├── internal/
│   ├── app/
│   ├── auth/
│   ├── billing/
│   ├── supplier/
│   ├── order/
│   ├── project/
│   ├── mailbox/
│   ├── mailparser/
│   ├── risk/
│   ├── webhook/
│   ├── queue/
│   ├── storage/
│   └── platform/
├── migrations/
├── sql/
├── deployments/
│   ├── docker/
│   ├── nginx/
│   ├── postfix/
│   └── monitoring/
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── styles/
│   └── public/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── product/
│   └── operations/
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── load/
├── Dockerfile.api
├── Dockerfile.web
├── Dockerfile.worker
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── README.md
└── todo.md
```

---

## 6. 核心产品模块规划

## 6.1 用户侧模块
- 登录注册
- 钱包 / 充值 / 账单
- 项目列表
- 价格和库存查询
- 一次性接码订单
- 长租邮箱订单
- 订单详情 / 提取结果
- Webhook 配置
- API Key 管理
- 历史记录

## 6.2 供应商侧模块
- 供应商资料与状态
- 域名管理
- 邮箱池 / 别名池管理
- 第三方邮箱账号池管理
- Gmail / Outlook / Hotmail / QQ / 163 / 126 / Yahoo / AOL / iCloud / Zoho / Fastmail / Yandex / GMX / Mail.com / Proton Bridge 账号接入
- OAuth / 授权码 / App Password / Bridge 凭证管理
- IMAP / POP3 / SMTP 配置与健康检查
- 供货规则
- 成本价设置
- 可售项目范围
- 收件路由配置
- 订单表现统计
- 结算与冻结金额

## 6.3 管理员模块
- 用户管理
- 供应商管理
- 项目管理
- 价格规则
- 风控规则
- 订单总览
- 财务总览
- 退款 / 争议处理
- 系统配置
- API 文档入口
- 审计日志

---

## 7. API 文档页面要求（单独页面，必须做）

## 7.1 方案
- OpenAPI 3.x 作为标准
- 使用 **Redoc** 生成文档页面
- 文档路径：`/docs`
- 可选内部调试路径：`/swagger`

## 7.2 文档范围
一期必须覆盖：
- 鉴权
- 用户资料
- 余额
- 项目列表
- 价格 / 库存
- 激活订单创建
- 长租订单创建
- 查询订单
- 获取提取结果
- 取消订单
- webhook 回调说明
- 供应商自建域名接入说明
- 供应商第三方邮箱账号接入说明（IMAP / POP3 / OAuth2 / 授权码 / App Password / Bridge）

二期扩展：
- 供应商 API
- 管理员 API
- SDK 示例

---

## 8. 高并发与容量设计（必须从一期就考虑）

## 8.1 并发目标
- 注册用户 1 万+
- 峰值并发请求 1000+
- 高频场景：
  - 下单
  - 轮询订单
  - 获取验证码
  - 入站邮件高峰解析
  - webhook 重试

## 8.2 性能设计原则
- 所有热路径可缓存就缓存
- 轮询接口必须设计为轻查询
- 订单状态变更必须异步化
- 原始邮件正文不直接放入热查询表
- 大文本 / MIME / 附件进入对象存储
- PostgreSQL 只存：
  - 元数据
  - 提取结果
  - 状态
  - 审计引用

## 8.3 数据库设计原则
- `orders` 表按时间或业务类型预留分区设计
- `messages` / `audit_logs` / `wallet_transactions` 提前考虑分区
- 使用 PgBouncer 管理连接池
- 索引优先覆盖：
  - `user_id + created_at`
  - `project_id + status`
  - `supplier_id + status`
  - `mailbox_id + created_at`
  - `external_message_id`

## 8.4 Redis 设计原则
- 所有 key 必须带前缀
- 所有缓存必须明确 TTL
- 不把 Redis 当主数据库
- 限流必须以 Redis 原子操作实现

## 8.5 队列设计原则
- 入站邮件与解析解耦
- 失败任务必须有 DLQ（死信队列）
- webhook 任务必须支持指数退避
- 账务任务必须幂等

---

## 9. 安全与商业化要求

## 9.1 必须实现的安全能力
- JWT / Session 双模式之一（建议 JWT + Refresh）
- 登录限流
- IP 白名单（API Key 级别）
- Webhook 签名校验
- 幂等键
- 审计日志
- 管理员高危操作二次确认
- 供应商侧敏感配置加密保存

## 9.2 商业化必须实现的账务能力
- 钱包余额
- 冻结余额
- 成功扣费
- 超时退款
- 手工调账
- 供应商待结算金额
- 供应商已结算金额
- 争议单标记

## 9.3 合规与隐私要求
- 原始邮件默认仅订单所有者可见
- 管理员查看原文必须有审计日志
- 供应商不能默认查看邮件原文
- 邮件与附件保留期可配置
- 日志必须做脱敏

---

## 10. 分阶段完整开发计划

## Phase 0：项目与环境初始化（第 1 周）

### 目标
完成基础仓库结构、开发工具链、Docker 开发底座。

### 任务
1. 建立 Go 后端基础目录
2. 建立 React + Vite + TS 前端目录
3. 建立 Docker 多阶段构建模板
4. 建立 `docker-compose.yml`
5. 接入 PostgreSQL / Redis / RabbitMQ / MinIO / PgBouncer
6. 建立 `.env.example`
7. 建立 `Makefile`
8. 建立基础 CI（lint/test/build）

### 输出
- 可启动空白前后端
- Docker Compose 一键拉起核心依赖
- 基础仓库规范完整

---

## Phase 1：身份、权限、共享控制台骨架（第 2-3 周）

### 目标
搭建与 new-api 一致的“单壳多角色”控制台。

### 任务
1. 后端实现用户、角色、权限模型
2. 前端实现单一 `ConsoleLayout`
3. 实现登录 / 登出 / 会话刷新
4. 实现动态菜单系统
5. 实现 `ProtectedRoute / SupplierRoute / AdminRoute`
6. 实现基础页面：
   - Dashboard
   - Profile
   - API Keys
   - Settings
7. 增加角色差异菜单：
   - 用户：订单 / 余额 / 项目
   - 供应商：域名 / 资源池 / 结算
   - 管理员：用户 / 供应商 / 价格 / 风控 / 审计

### 输出
- 一套共享控制台页面
- 菜单权限模型跑通

---

## Phase 2：核心订单与项目能力（第 4-6 周）

### 目标
实现商业最核心的一次性邮件接码流程。

### 任务
1. 项目管理模型
2. 域名池 / 邮箱池模型
3. 第三方邮箱账号池模型（provider / source_type / auth_mode / protocol_mode）
4. 激活订单状态机
5. 下单接口
6. 查询订单接口
7. 获取提取结果接口
8. 取消订单接口
9. 轮询接口优化
10. 价格 / 库存接口
11. 管理员项目配置页面
12. 用户下单页面
13. 供应商资源录入页面（支持自建域名与主流邮箱账号）

### 输出
- 用户可下单
- 系统可分配邮箱地址
- 可查询订单状态

---

## Phase 3：SMTP 接收链路与邮件解析（第 6-8 周）

### 目标
打通从公网邮件接收到业务提取的完整链路。

### 任务
1. 部署 Postfix（或确定宿主机运行方式）
2. 配置本机 25 端口接收策略
3. 配置测试域名的 MX
4. 建立 Postfix -> Go ingest handoff
5. 存储原始 MIME 到 MinIO
6. 写入邮件元数据到 PostgreSQL
7. 推送解析任务到 RabbitMQ
8. 实现验证码 / link 提取器
9. 实现提取规则回退机制（已完成：支持连续数字、空格/短横线分隔验证码与链接回退）
10. 订单自动状态迁移（已完成：READY/TIMEOUT/FINISHED 自动迁移）
11. 实现 IMAP 拉取器（骨架已完成）
12. 实现 POP3 拉取器（骨架已完成）
13. 实现 OAuth2 凭证刷新机制（已完成：Gmail / Microsoft HTTP refresh 接入）
14. 实现授权码 / App Password 型账号健康检查（已完成：provider_accounts 健康状态落库、credential_secret/secret_ref 校验与录入，支持 `env://` secret_ref 解析，限制官方邮箱端点，并执行 IMAP/POP3 实际登录校验）
15. 实现 Proton Bridge 型资源接入策略（已完成：bridge 默认主机/端口、endpoint 校验、健康检查与录入字段）

### 输出
- 邮件可进系统
- 可成功提取验证码 / 链接
- 自建域名与第三方邮箱账号都可被系统摄取
- 订单可进入 READY / FINISHED

---

## Phase 4：账务、退款、供应商闭环（第 8-10 周）

### 目标
形成真正可商业运营的交易闭环。

### 任务
1. 用户钱包（已完成）
2. 冻结余额（已完成：下单时冻结 quoted_price）
3. 成功扣费（已完成：订单 FINISHED 时扣减冻结余额）
4. 超时退款（已完成：取消/超时自动退回可用余额）
5. 供应商待结算余额（已完成：订单完成后累计到 supplier_settlement_ledger；本轮新增管理员结算确认，pending 流水可原子标记 settled 并迁移到账本 settled_amount，写入 settle_supplier_pending 审计）
6. 供应商资源成本模型（已完成：供应商可维护项目成本模型，inactive 不参与报表成本计算；本轮新增供货规则维护，`GET/POST /api/v1/supplier/resources/offerings` 支持当前供应商按项目/域名池维护售价、成功率、优先级和来源类型，列表按供应商隔离）
7. 供应商供货页面（已完成：新增共享控制台 `/supplier/offerings` 页面与侧边栏入口，供应商可维护并查看自有供货规则）
8. 管理员调账能力（已完成：/admin/wallet-adjustments）
9. 争议单处理流程（已完成首个里程碑：用户/供应商可对 FINISHED/TIMEOUT 订单发起争议，管理员可处理退款/驳回；本轮补强退款处理契约，`refund_amount > 0` 时必须显式使用 `resolution_type=refund`，避免“人工调整”类型误触发真实退款；本轮补强管理员争议单列表筛选体验，支持显式状态/条数草稿查询，避免输入变化触发请求风暴，并已通过真实 API 验证 open/resolved/非法状态路径）
10. 供应商报表页面（基础结算流水已完成；本轮补强项目级报表筛选，支持 `from/to/limit`，真实 API 验证 200/400 与索引存在）

### 输出
- 用户能充值消费
- 供应商能供货并结算
- 管理员能处理异常单

---

## Phase 5：API 文档、Webhook、运营与风控（第 10-12 周）

### 目标
补齐面向客户和运营的商业化能力。

### 任务
1. 生成 OpenAPI 文档（已完成：补充 `web/public/openapi/openapi.yaml` 初始规范）
2. 挂载 `/docs` Redoc 页面（已完成：控制台 `/docs` 页面加载 Redoc）
3. webhook 配置与重试机制（已完成异步真实投递里程碑：`GET/POST /api/v1/webhooks/endpoints`、`POST /api/v1/webhooks/endpoints/:id/test-delivery` 与 `GET /api/v1/webhooks/endpoints/:id/deliveries`；创建时生成签名 secret 且仅首次返回，列表仅返回 `secret_preview`；已建立 `webhook_endpoints` / `webhook_deliveries` schema，test-delivery 写入 `pending` 重试状态记录并由独立 `webhook-worker` 异步真实 POST，携带 `X-Nexus-Webhook-Signature: sha256=...`，2xx 标记 `sent`，失败按指数退避重试，达到最大尝试次数后标记 `failed`，并支持陈旧锁回收；投递记录查询仅返回当前用户自有 endpoint 下最近重试状态；创建与发送前均加入 http/https 与本地/内网/link-local/internal host SSRF 拦截；已通过真实 API 回放验证签名 POST 与 sent 状态）
4. API Key 权限与 IP 白名单（已完成 IP 白名单管理里程碑：`PATCH /api/v1/auth/api-keys/:id/whitelist` 可更新当前用户名下 active API Key 白名单，复用 IP/CIDR 规范化与非法值拒绝逻辑，更新动作写入 `update_whitelist` 审计并支持管理员 `/api/v1/admin/audit?action=update_whitelist` 筛选；真实 API 回放已验证错误白名单下 API Key 访问返回 403，更新为实际来源 IP 后同一路由返回 200；本轮新增商业 API 下单入口 `POST /api/v1/orders/activations/api-key`，要求 `activation:write` scope，read-only key 返回 403，write-scope key 可真实创建订单并纳入 OpenAPI `apiKeyAuth` 文档）
5. 限流系统（已完成首个里程碑：API Key 运行时内存滑窗限流，每个 Key 每分钟 60 次，超限返回 429 并记录 `denied_rate_limit` 审计；已通过 70 次真实 API 连续请求验证）
6. 风控规则（已完成首个里程碑：新增 `risk_rules` 表、默认规则 seed、管理员 `GET/PUT /api/v1/admin/risk/rules`，前端风控中心可编辑启用状态/阈值/窗口/等级，规则更新写入 `update_risk_rule` 管理员审计并补充 OpenAPI 文档，已通过真实 API 验证默认规则、非法阈值 400 与更新后持久化）：
   - 高频取消
   - 高频超时
   - API 异常访问
   - 发件人黑名单（已完成：新增管理员 `GET/PUT /api/v1/admin/risk/sender-blacklist`，mail-ingest 在 SMTP DATA 前以 554 拒收命中发件人并写入 `sender_blacklist_hit`，`/admin/risk` 暴露 `sender_blacklist_hits` 与对应风险信号；真实 API/SMTP 回放已验证）
7. 审计日志（已完成财务运营审计补强里程碑：管理员 `/api/v1/admin/audit` 可查询 API Key 创建/撤销与运行时鉴权成功/拒绝事件、`update_whitelist` 白名单变更、`update_risk_rule` 风控规则变更，并新增 `admin_wallet_adjustment`、`update_supplier_cost_profile`、`resolve_dispute` 三类 Phase 4 财务运营动作过滤；成本模型更新、管理员调账与争议处理会写入可筛选审计，已通过真实 API 回放验证）
8. 仪表盘统计（已完成深度统计里程碑：管理员 `/api/v1/admin/overview` 输出订单完成/超时/取消率、完成订单流水、平均完成客单价、争议发生率、鉴权拒绝总数/拒绝率，前端 Dashboard 展示这些深度指标；已通过真实 API 回放验证字段与数值存在）

### 输出
- 独立 API 文档页面可访问
- 商业 API 可对外提供
- 风控初步可用

---

## Phase 6：性能、灰度、上线准备（第 12-14 周）

### 目标
让系统可承载 1 万用户、1000+ 并发的商业环境。

### 任务
1. 压测脚本编写
2. 订单轮询接口压测
3. 入站邮件高峰压测
4. PostgreSQL 索引与慢查询优化
5. Redis 热 key / 内存优化
6. RabbitMQ 队列堆积策略
7. Docker 镜像瘦身
8. 监控接入：
   - Prometheus
   - Grafana
   - 应用指标
   - 队列指标
   - 数据库指标
9. 日志归集
10. 上线 Checklist

### 输出
- 压测报告
- 上线部署方案
- 回滚方案

---

## 11. 前端页面规划（共享控制台）

## 11.1 公共页面
- 登录页
- 忘记密码
- Dashboard
- 个人资料
- API Keys
- 通知中心
- 文档入口

## 11.2 用户菜单
- 项目市场
- 激活订单
- 长租邮箱
- 订单历史
- 钱包账单
- Webhook 设置

## 11.3 供应商菜单
- 我的域名
- 邮箱池 / 别名池
- 第三方邮箱账号池
- 凭证管理（OAuth / 授权码 / App Password / Bridge）
- 协议配置（IMAP / POP3 / SMTP）
- 健康检查 / 失效告警
- Bridge 资源管理
- 供货规则
- 成本设置
- 订单表现
- 结算中心

## 11.4 管理员菜单
- 用户管理
- 供应商管理
- 项目管理
- 价格策略
- 风控中心
- 审计日志
- 系统设置
- 监控概览

### 页面设计要求
- 风格贴近 new-api：
  - 简洁科技感
  - 深浅色主题可选
  - 左侧导航为主
  - 卡片式统计面板
  - 统一图标体系
- 所有角色共用同一 Layout，不允许复制一份“admin 前端”

---

## 12. 数据库表优先级规划

## P0 首批表
- `users`
- `roles`
- `user_roles`
- `api_keys`
- `projects`
- `suppliers`
- `domains`
- `mailboxes`
- `mailbox_accounts`
- `provider_credentials`
- `resource_pools`
- `orders`
- `messages`
- `extractions`
- `wallet_transactions`

## P1 第二批表
- `refunds`
- `risk_events`
- `webhook_endpoints`
- `webhook_deliveries`
- `supplier_settlements`
- `audit_logs`

## P2 第三批表
- `pricing_rules`
- `dashboard_snapshots`
- `notification_events`
- `attachments`

---

## 13. 测试计划（必须写入开发节奏）

## 13.1 后端测试
- 单元测试
- service 层测试
- repository 层测试
- 队列消费者测试
- 邮件解析规则测试

## 13.2 前端测试
- 核心组件测试
- 菜单权限测试
- 路由守卫测试
- 关键表单测试

## 13.3 集成测试
- 下单 -> 邮件到达 -> 提取 -> 完成
- 超时 -> 自动退款
- 供应商异常 -> BAD_RESOURCE
- webhook 重试链路

## 13.4 压测
- 登录接口
- 下单接口
- 订单查询接口
- 解析队列吞吐
- Redis 限流
- PostgreSQL 连接池

---

## 14. 必须优先落实的非功能性要求

- Docker 化开发与部署
- 单机环境可跑全套依赖
- 数据持久化
- 可监控
- 可审计
- 可回滚
- 能灰度
- 邮件原文安全可控
- 角色共用一个系统页面
- API 文档单独页面可访问

---

## 15. 明确的执行顺序（从下一步开始）

## 下一步优先顺序
1. 安装本机开发工具链（Go / Docker / pnpm）
2. 初始化仓库目录结构
3. 生成 Docker 开发底座
4. 初始化 PostgreSQL / Redis / RabbitMQ / MinIO / PgBouncer
5. 初始化 React 控制台骨架（new-api 风格）
6. 初始化 Go API 服务
7. 建立权限模型与共享菜单系统
8. 实现订单与项目最小闭环
9. 打通 Postfix + 邮件接收链路
10. 接入 OpenAPI + Redoc `/docs`

---

## 16. 本计划的关键定论

### 最终推荐栈
- 后端：Go + Gin
- 前端：React + Vite + TypeScript + Semi Design
- 持久数据库：PostgreSQL
- 连接池：PgBouncer
- 缓存：Redis
- 队列：RabbitMQ Quorum Queues
- 对象存储：MinIO
- 邮件边缘：Postfix
- 文档：OpenAPI + Redoc
- 编译部署：Docker + Docker Compose（一期）

### 最终 UI / 权限结论
- 与 new-api 一致采用：**单一共享控制台 + 按角色扩展菜单与路由**
- 不做三套系统页面
- API 文档页独立暴露 `/docs`

### 最终基础设施结论
- 本机具备 25 端口能力，可用于邮件接收边缘
- 但公网 SMTP 第一跳仍建议使用 Postfix，不建议一期直接用 Go 替代完整 MTA

---

## 17. 备注

这是一个商业项目，因此开发优先级必须遵循：

1. **可运营**
2. **可计费**
3. **可审计**
4. **可扩展**
5. **再追求功能花哨**

因此一期严禁过度追求：
- 微服务拆太细
- 多种数据库并存
- 复杂工作流引擎提前引入
- 三套前端后台
- 直接裸写公网 SMTP 全协议栈

应优先把：
- 共享控制台
- 核心订单闭环
- 邮件接收闭环
- 钱包退款闭环
- API 文档闭环
- Docker 部署闭环

先做扎实。
