# Nexus-Mail 完整开发计划（todo.md）

> **执行模式已切换：** 本文档不再只是规划稿，而是当前仓库的**执行中路线图**。后续提交必须对照阶段目标更新状态，并在阶段完成后进入下一阶段。

## 执行状态看板（持续维护）

### 当前总体进度
- Phase 0：**已完成**（开发底座、Docker、多服务骨架已提交）
- Phase 1：**已完成**（身份权限、共享控制台骨架已提交）
- Phase 2：**已完成**（项目/库存/激活订单主链路、管理员项目配置、供应商资源录入已提交）
- Phase 3：**已完成**（已完成 SMTP 会话落盘、metadata 入库、RabbitMQ 解析任务入队、MinIO 原始对象上传，并打通验证码/link 提取回退增强、订单 READY/FINISHED 自动迁移、真实 OAuth2 刷新接入、授权码/App Password/密码型凭证录入与健康状态落库、`env://` secret_ref 解析、IMAP/POP3 实际登录校验、官方邮箱端点限制、Proton Bridge 接入策略与 Postfix 转发样例）
- Phase 4：进行中（已完成用户钱包、冻结余额、成功扣费、超时退款、供应商待结算余额、管理员调账能力与基础结算页面；已完成供应商报表筛选、供货规则维护、管理员争议单显式筛选、供应商域名运营页、管理员供应商运营页与共享控制台深色单壳导航收敛；已完成 Webhooks / 风控 / 审计真实页面收敛与对应真实 API 回放验证；本轮继续优先补全注册后前端工作台首轮引导：保持单一登录后控制台与 new-api 风格深色壳不变，在 `DashboardPage` 为普通用户增加注册后共享控制台首轮任务卡（采购 / API 接入 / 角色扩展说明），并在 `SettingsPage` 增加“首次使用清单”与“重新打开首轮引导”回入口；补齐 `App.test.tsx` 覆盖注册成功后首轮任务卡展示、引导关闭后从设置页重新打开、普通用户首轮引导不泄露供应商/管理员任务文案；控制器依据五维评审整改，移除 `DashboardPage` 未使用回入口辅助函数、统一 Dashboard/Settings 首轮引导路由常量，并将角色扩展文案改为“后续被服务端授予角色”以避免把本地引导误写成服务端事实；已通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、Docker Compose 重建后的真实 API `/healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/me` 验证普通用户共享菜单与页面入口仍可用；当前前端后续重点转为继续收敛定向 Vitest 选择范围与更多共享控制台页面细化；本轮已将 SettingsPage 升级为贴近 new-api / Linear 深色共享控制台的 Console Mission Control：新增深色任务总览、集成任务流（API Keys / Webhook / Docs）与控制台能力矩阵，保留普通用户首次使用清单与角色差异快捷入口；补齐 `SettingsPage.test.tsx` 对深色控制台入口、规范化共享路由导航与供应商场景抑制首轮清单的 focused 回归；已通过 `pnpm --dir web build`、`go test ./...`、Docker Compose 重建后真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/settings` 页面访问验证注册后共享控制台接入链路仍成立；下一前端优先项转为继续清理共享控制台 focused Vitest 噪声与补强更多页面的深色壳一致性；本轮已修复共享控制台 API Keys 路由真值漂移，恢复 `API_KEYS_ROUTE` 与 `/api-keys` 一致，并将 Dashboard / Settings / Profile / Orders 内相关 CTA 与菜单判断统一收口到共享路由常量；补齐 `App.test.tsx`、`ProfilePage.test.tsx`、`OrdersPage.test.tsx` 对注册后 onboarding、资料页与订单空态进入 API Keys 页的真实导航断言；已重新通过 `pnpm --dir web test -- src/App.test.tsx src/pages/ProfilePage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ProjectsPage.test.tsx src/components/ConsoleLayout.test.tsx`、`pnpm --dir web build`，并在 Docker Compose 重建后通过真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 验证注册后普通用户共享菜单仍包含 `/api-keys` 等基础接入入口；本轮已修复共享控制台路由常量 `API_KEYS_ROUTE`，恢复 `/api-keys` 页面路由语义，并补齐 `App.test.tsx` 对“注册后普通用户仍可到达共享集成入口”“普通用户菜单不泄露供应商/管理员扩展入口”的 focused 回归；已重新通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway webhook-worker` 与真实 API `POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 验证共享控制台注册后基础采购 / 集成链路仍然成立；本轮已完成共享控制台前端采购/履约续航文案细化：在 `ProjectsPage` hero 增加“继续 API 接入准备：文档与密钥配置仍留在同一控制台”提示，在 `OrdersPage` hero 增加“接入联调仍在同一控制台继续：可直接回到 API Keys 校验自动化调用”提示，并补齐 `ProjectsPage.test.tsx` / `OrdersPage.test.tsx` 对可见与无权限隐藏分支的 focused Vitest 覆盖；已重新通过 `pnpm --dir web test -- src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway webhook-worker` 后的真实 API `/healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 验证；后续前端可继续补齐项目市场 / 订单中心与 API Keys / Webhooks 的跨页导航 CTA 与 vendor chunk 优化；本轮已完成共享控制台前端阻塞项修复：移除 refresh token 的 sessionStorage 持久化、将 bootstrap 失败从“误触发服务端 logout”收敛为仅本地会话清理、把 App 路由切换为 React.lazy 页面级拆包并统一关键控制台路由常量；已重新通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway` 以及真实 API `/healthz`、`POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与本地登录页浏览器可视检查；当前剩余前端性能问题从“整站单包阻塞”降级为后续继续处理共享 vendor chunk 体积优化。本轮已修正 `web/src/utils/consoleNavigation.test.ts` 与真实实现漂移：测试改为直接覆盖 `consoleNavigation.tsx` 的 shared-console 落地优先级与 fallback 行为，并确认删除历史冗余 `web/src/utils/consoleNavigation.ts` 后 focused Vitest / build / go test / 真实注册与菜单 API / 本地浏览器视觉检查全部通过；本轮已修复 `web/src/App.test.tsx` 管理员风险工作台 focused 断言漂移：将“redirects admin users to their preferred shared-console workspace after session bootstrap”收敛为从首选管理路由 `/admin/risk` 启动并断言 `风险指挥台` + `保存规则` 的真实页面可见，同时把管理员深度统计断言中的 `鉴权拒绝总数：2` 改为精确文本匹配，避免宽松函数匹配在 Semi UI 渲染下失效；已重新通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway` 后的真实 API `/healthz`、`POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/` `/settings` `/orders` `/profile` `/webhooks` `/docs` 入口 200 验证；本轮已完成 `web/src/App.test.tsx` focused 测试首轮收敛提交前验证：修正管理员默认落地、supplier 域名跳转、settings 与 webhook/admin dashboard 的 stale 断言，使当前共享控制台实现下的 focused Vitest 再次通过；已重新通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose config`、`docker compose up -d --build api web gateway`，并以本地脚本真实验证 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /healthz` 及前端 `/` `/settings` `/orders` `/profile` `/webhooks` `/docs` 入口 200；五维评审已阻止把管理员 landing 测试退化为仅看 store.menu，当前后续重点保持为继续收敛重复 CTA / 宽松选择器与全量 web 测试既有 warning 噪音。本轮已补齐共享控制台角色落地页与页内下一步 CTA 收敛：新增 `web/src/utils/consoleNavigation.ts` 统一角色优先路由解析，在会话启动后按服务端 `/auth/menu` 为管理员/供应商选择首个高价值工作台（普通用户仍保留 Dashboard 首轮引导），并将 `ProjectsPage` / `OrdersPage` / `ProfilePage` 的空态与资料页下一步动作统一约束在同一控制台内，避免出现“去另一套后台”的叙事；已通过 `pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway` 后的真实 API `POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /api/v1/admin/risk` 与前端 `/` `/settings` `/orders` `/profile` 直连 200 验证；当前遗留前端跟进项为继续修复/收敛 Vitest 中既有的大范围测试噪音与新旧断言漂移，再补齐角色落地路由与页内 CTA 的 focused 测试覆盖；本轮先对 `web/src/App.test.tsx` 与 `web/src/pages/OrdersPage.test.tsx` 做首轮 focused 断言收敛，修正因共享控制台重复标签与页面文案演进导致的部分 stale selector/文案断言，并重新通过 `go test ./...`、`pnpm --dir web build`、`docker compose up -d --build api web gateway`、真实 API 注册/登录/菜单/总览/风控/审计回放及前端 `/` `/settings` `/orders` `/profile` `/webhooks` `/docs` 直连 200 验证当前前端壳与后端契约仍可用；但五维评审确认 `App.test.tsx` 仍存在更广泛的历史测试噪音与若干被放宽过度的断言，当前状态应保持为前端测试收敛进行中，不宣称 focused Vitest 已完全恢复。本轮已修复共享控制台菜单/快捷入口必须以服务端 `/auth/menu` 为准的问题：移除 `AppSidebar` 基于本地角色的 fallback privileged menu，顶部快捷入口改为从服务端菜单派生，并把普通用户首轮引导 localStorage 键改为按用户 ID 隔离，避免一个账号关闭引导后影响同浏览器的其他用户；已补齐 `App.test.tsx` 与 `AppSidebar.test.tsx` 覆盖菜单加载态与按用户隔离引导状态，并再次通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、真实 API 注册/登录 + `/auth/menu` + 前端 `/`/`/settings` 200 验证。本轮已继续完成共享控制台路由 schema 收敛切片：将 Sidebar 分组、Layout 标题/快捷动作与 landing 路由优先级统一沉淀到 `web/src/utils/consoleNavigation.tsx`，删除 `AppSidebar.tsx` 与 `ConsoleLayout.tsx` 中重复的图标/标题/路径白名单映射，并新增 `web/src/components/ConsoleLayout.test.tsx`、`web/src/utils/consoleNavigation.test.ts` focused 测试保护共享壳标题、快捷入口与角色优先级模型；控制器完成五维评审后确认本 diff 无新增阻塞问题，已重新通过 `pnpm --dir web test -- src/utils/consoleNavigation.test.ts src/components/ConsoleLayout.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway`，以及真实 API `POST /api/v1/auth/register`(201)、`POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/` `/settings` `/orders` 入口 200 验证；下一优先级继续保持为补齐 `SettingsPage` / `ProtectedRoute` focused 测试，并在不破坏单壳前提下继续细化角色页体验。本轮已补齐 `web/src/pages/SettingsPage.test.tsx` 与 `web/src/components/ProtectedRoute.test.tsx`：新增普通用户设置页首轮引导清单的真实路由跳转/重开 onboarding 回归，显式覆盖 supplier settings 不显示首轮清单但保留共享快捷入口；同时为 `SupplierRoute` / `AdminRoute` 新增未登录先跳 `/login`、普通用户/供应商越权回退共享首页、supplier/admin 可在同一共享控制台壳内访问授权页的 focused 用例，响应五维评审中对真实路由契约与权限边界覆盖不足的阻断意见。当前已重新通过 `pnpm --dir web test -- src/components/ProtectedRoute.test.tsx src/pages/SettingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build api web gateway webhook-worker`，并通过本地脚本真实验证 `/healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`；当前前端仍有非本轮新增的 Vitest `act(...)` / `findDOMNode` warning 与 vendor chunk >500k 警告，已作为后续共享控制台测试与性能收敛项保留。）
- Phase 5：进行中（本轮补强管理员高危操作二次确认：`POST /api/v1/admin/wallet-adjustments` 必须携带 `confirmation_phrase=确认调账`，`POST /api/v1/admin/supplier-settlements` 必须携带 `confirmation_phrase=确认结算`，后端在账务副作用前校验，前端表单与 OpenAPI 契约同步更新，并已通过真实 API 验证缺失确认 400、正确确认调账 200 与审计可查；已接入 OpenAPI 3 初始规范文件与 `/docs` Redoc 页面；已补齐管理员 `/api/v1/admin/audit` 审计查询接口，可基于真实 API 回放查询 API Key 生命周期与鉴权事件；已交付管理员 `/api/v1/admin/overview` 真实聚合概览、`/api/v1/admin/risk` 风险信号汇总，以及前端管理端风控/审计/仪表盘真实数据页面；已补强 API Key 创建默认最小权限：省略 scopes 时默认 `activation:read`、显式空白 scopes 拒绝，并通过真实 API Key 创建/使用/撤销回放验证；已交付 API Key IP 白名单管理里程碑：支持 `PATCH /api/v1/auth/api-keys/:id/whitelist` 更新白名单、规范化 IP/CIDR、写入 `update_whitelist` 审计并可由管理员审计接口筛选，已通过真实 API 回放验证更新前 403、更新后 200；本轮补齐共享控制台前端白名单编辑闭环：`/api-keys` 页面新增“编辑白名单”入口，保持单一登录后控制台与角色扩展文案一致，支持回填/清空/失败提示，并补齐 Vitest 覆盖与真实 API 验证注册→菜单→创建 Key→非法白名单 400→合法白名单 200→管理员审计 `update_whitelist` 查询；已交付 API Key 运行时限流首个里程碑：同一 API Key 每分钟 60 次后返回 429 并写入 `denied_rate_limit` 审计；本轮补强为 Redis 全局计数限流，API 启动时连接 `REDIS_URL` 并使用 Lua 原子 `INCR` + `PEXPIRE` + TTL 修复，按稳定 API Key ID 计数并哈希 Redis key，支持独立限流超时、Redis 连接池/读写超时配置、`/healthz` Redis readiness，后端故障脱敏返回 503 并记录 `rate_limit_backend_error` 审计；真实 API 连续 70 次请求验证 60 次 200、10 次 429、Redis key 带 TTL、`/healthz` 返回 `redis=ok`、管理员审计可查询 `denied_rate_limit` 与 `rate_limit_backend_error`；已交付 API Key 商业下单写权限入口：新增 `POST /api/v1/orders/activations/api-key`，仅接受包含 `activation:write` scope 的 API Key，复用白名单/限流/审计链路并补充 OpenAPI `apiKeyAuth` 文档，真实 API 验证 read-only 403、write-scope 201 创建订单；已交付 Webhook 配置、重试可观测性与异步真实投递里程碑：用户鉴权下 endpoint 创建/列表、一次性签名 secret、secret_preview 列表脱敏、SSRF URL 拦截、test-delivery 创建 pending delivery 并由独立 webhook-worker 异步真实 POST，携带 HMAC-SHA256 签名，2xx 标记 sent，失败按指数退避重试并支持陈旧锁回收，同时新增 `GET /api/v1/webhooks/endpoints/:id/deliveries` 查询当前用户 endpoint 的最近投递/重试记录；已交付可配置风控规则首个里程碑：新增 `GET/PUT /api/v1/admin/risk/rules`、`risk_rules` schema/default seed、前端风控规则表格编辑、`update_risk_rule` 管理员审计、OpenAPI 文档，并通过真实 API 验证默认规则、非法阈值 400、更新后持久化；本轮补强风控规则运行时生效：`/api/v1/admin/risk` 会实时读取 `risk_rules` 的 enabled/threshold/severity 来过滤与标记风险信号，前端保存规则后自动刷新风险信号，OpenAPI 补齐 AdminRiskResponse 契约，真实 API 已验证规则更新后风险接口仍返回配置驱动的有效信号；本轮补强仪表盘深度统计：管理员 overview 增加订单完成/超时/取消率、完成订单流水、平均完成客单价、... [truncated]
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

### 最新执行检查点（2026-05-02）
- 本轮继续按"前端优先"补齐 `BalancePage` shared-console 纵向切片：新增 `web/src/pages/BalancePage.test.tsx` focused 导航回归，真实验证 Finance Mission Control 内的采购、订单、API Keys、Webhook、Docs 五个 CTA 均留在单一登录后共享控制台链路中跳转，而不是退化为仅检查文案存在。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/BalancePage.test.tsx`、`pnpm --dir web exec vitest run src/pages/BalancePage.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/SettingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/wallet/overview`、`GET /api/v1/wallet/transactions`、`POST /api/v1/wallet/disputes/999999`（预期 400）验证余额中心切片未破坏注册后共享控制台与真实钱包接口契约。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；代码质量评审指出重复 CTA 选择器过于依赖顺序后，已收敛为 mission-card scoped role 查询并复验通过；测试/可靠性评审指出订单 CTA 可访问名称包含图标文本后，已改为正则 role 查询并复验通过。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续统一 `DashboardPage` 与余额/采购链路的共享控制台 CTA 叙事，然后再推进 Phase 4/5 余下后端能力。
- 本轮继续按"前端优先"推进普通用户主链路：已将 `ProjectsPage` 与 `OrdersPage` 收敛为更贴近 new-api / Linear 深色共享控制台的采购/履约切片，在保持页面主标题仍为"项目市场" / "订单中心"的前提下，新增共享控制台首轮路径卡片，串联采购 → 订单 → API Keys 的连续入口，而不是再造独立子后台。
- 已补齐 `web/src/pages/ProjectsPage.test.tsx` 与 `web/src/pages/OrdersPage.test.tsx` focused 回归，覆盖共享控制台切片渲染、采购后进入订单中心、订单结果后回到项目市场/进入 API Keys、以及当 `menu` 仅保留当前页与共享仪表盘时的"返回推荐工作台"真实导航断言。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放：`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/admin/wallet-adjustments` 为测试用户加款、普通用户 `GET /api/v1/projects/inventory`、`POST /api/v1/orders/activations`、`GET /api/v1/orders/activations`、`GET /api/v1/orders/activations/:id/result`、`GET /api/v1/auth/api-keys`、`GET /docs`，确认新的前端切片没有破坏注册后共享控制台入口链路与真实采购/履约接口契约。
- 本轮五维评审结论：产品/规格、代码质量、测试/可靠性均在首轮指出命名层级/路由一致性/测试耦合问题后完成整改并复验通过；安全/集成与性能/运维通过。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续把 `BalancePage` / `DashboardPage` / 采购后续页面的共享控制台 CTA 与深色壳叙事进一步统一，然后再继续推进 Phase 4/5 其余后端能力。
- 本轮新增一个供应商前端 focused 纵向切片补强：`web/src/pages/SupplierResourcesPage.test.tsx` 已补上 Supplier Resource Mission Control 的真实导航与表单闭环断言，覆盖从资源页进入 `/supplier/domains`、`/supplier/offerings`、`/supplier/settlements` 的共享控制台任务流跳转，以及域名池 / 第三方邮箱账号 / 邮箱池三类表单提交后重新拉取 `getSupplierResourcesOverview` 的真实刷新链路，继续保持单一登录后深色控制台与角色菜单扩展模型不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierResourcesPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`（201）、`GET /api/v1/auth/menu`（200，确认普通用户共享菜单含 `/`、`/api-keys`、`/webhooks`、`/docs`）、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`，以及管理员 `POST /api/v1/auth/login`、`GET /api/v1/supplier/resources/overview`（200 且返回真实 domains/accounts/mailboxes），确认本轮补强仅增强供应商资源页 focused 回归，不破坏注册后共享控制台入口链路与真实资源接口契约。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅保留两个非阻塞后续项：其一，`SupplierResourcesPage.test.tsx` 当前仍通过 `getAllByRole('button') + textContent` 锁定任务流按钮，后续可继续收敛为更稳定的 scoped accessible selector；其二，资源页提交流程对 `getSupplierResourcesOverview` 的调用次数断言与占位符选择器仍偏实现细节，可在下一轮 shared-console 测试基线清理时再降脆弱度，但当前不阻塞该 focused 纵向切片提交。

- 本轮继续按前端优先推进 shared-console focused 回归：已为 `ProjectsPage` / `OrdersPage` 补齐空态“返回推荐工作台” CTA 的渲染与真实导航断言，覆盖当服务端 `menu` 仅保留当前页与共享仪表盘时，普通用户仍可在单一登录后控制台内回到推荐工作台，而不是卡死在孤立空页。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx`、`pnpm --dir web exec vitest run src/App.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx src/utils/consoleNavigation.test.ts src/components/ConsoleLayout.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`（201）、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs` 以及前端 `/settings`、`/projects`、`/orders` 200，确认本轮新增回退 CTA 断言没有破坏注册后共享控制台入口链路。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅保留两个非阻塞后续项：其一，`ProjectsPage.test.tsx` 中创建订单用例的异步同步点可在后续如有抖动时再收紧；其二，`返回推荐工作台` 因页面内存在重复 CTA，后续可继续改为区域级 scoped selector，但当前不阻塞该 focused 回归里程碑提交。
- 本轮继续执行前端优先切片：已为 `ApiKeysPage` / `WebhooksPage` 补齐共享控制台接入 CTA 对称性，在单一登录后控制台内把 API Keys → Webhooks → Docs 的首轮接入路径收敛为可点击的真实下一步动作；新增基于服务端 `menu` 的显隐控制，确保普通用户仅在后端暴露 `/api-keys`、`/webhooks`、`/docs` 时看到对应 CTA，不因前端文案泄露未授权入口。
- 已补齐 `web/src/pages/ApiKeysPage.test.tsx` 与 `web/src/pages/WebhooksPage.test.tsx` focused 回归，覆盖：空态 CTA、首轮引导 CTA、无权限时 CTA 抑制，以及 Docs / API Keys 路由点击后进入目标工作台的真实导航断言；同时修复并重新确认共享路由常量 `API_KEYS_ROUTE='***'` 与 Webhook 签名密钥展示时长常量。
- 控制器已通过 focused 页面测试复核（当前仓库仍存在与本 diff 无关的 `App.test.tsx` 既有旧失败噪声）、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway` 与真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`，确认注册后普通用户共享菜单仍返回 `/api-keys` / `/webhooks` / `/docs`，且新 CTA 所依赖的真实接口与文档入口保持可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审仅建议后续再补一条 `返回推荐工作台` CTA 的 focused 导航断言，并继续把既有全局 Vitest `act(...)` / Semi UI `findDOMNode` / `App.test.tsx` 审计导航旧失败作为下一前端优先项处理，不阻塞本次共享接入 CTA 里程碑提交。
- 本轮先完成前端测试基线收口补丁：将 `App.test.tsx` 中 Settings→Admin Audit 导航断言从过时页面文案 `审计日志` 对齐为当前 mission-control 标题 `Audit Mission Control`，消除共享控制台管理员设置快捷入口的既有 focused 失败，并继续保持单一登录后控制台 / 角色菜单扩展模型不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，以及真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`、前端 `/settings` 返回 200，确认本轮仅修复 focused 测试契约漂移，运行时共享控制台链路与真实接口仍可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；当前 diff 仅修正测试断言，不引入新的运行时代码。保留前端 chunk 体积告警、Semi UI `findDOMNode` 与既有 React Testing Library `act(...)` 噪声为后续非阻塞债务，并按 todo 保持下一步继续以前端优先推进。
- 本轮新增一个前端 focused 纵向切片补强：`web/src/pages/WebhooksPage.test.tsx` 已补上共享控制台首轮接入导航断言，通过真实页面按钮验证普通用户可从 Webhook 工作台继续进入 API Keys 与 API 文档，而不是只停留在接入文案展示；测试同时改为复用共享路由常量，避免 `/api-keys` / `/docs` 路径再次与控制台注册路由漂移。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/WebhooksPage.test.tsx`、`pnpm --dir web exec vitest run src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`、前端 `/settings`、`/webhooks` 200，确认注册后普通用户共享菜单仍返回 `/api-keys` / `/webhooks` / `/docs`，新增导航断言对应的真实接口与页面壳链路保持可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅记录两个非阻塞后续项：其一，后续可继续为 `返回推荐工作台` CTA 增加 focused 导航断言；其二，保留既有全局 Vitest `act(...)`、Semi UI `findDOMNode` 与前端 chunk 体积告警为下一前端优先债务，不阻塞本次测试基线加固提交。

- 本轮先完成一轮前端基线与注册后连续路径修复：控制器确认当前工作树中存在被掩码污染的前端常量回归后，修复共享导航常量与 Webhook 签名密钥展示超时常量的运行时真值；同时为 `ProjectsPage` / `OrdersPage` 新增 focused Vitest，覆盖注册后普通用户在单一共享控制台内沿“项目市场 → 订单中心 → API Keys”继续前进的真实点击导航，不再只停留在文案存在性断言。

- 本轮五维评审结论：产品/规格、代码质量、安全/集成均指出当前仓库原有的共享导航回归尚未完全收口（`SettingsPage -> AdminAuditPage` 的 `App.test.tsx` 旧失败、以及 quick actions / post-auth landing fallback 的共享导航辅助函数一致性问题）；控制器已立即修正 `ConsoleLayout` 的 role-aware quick actions、收紧 `resolvePostAuthLandingRoute` 回到 allowlist fallback、恢复未知路径标题兜底，并同步更新 `consoleNavigation.test.ts`。但 `App.test.tsx` 仍保留一个与旧管理员审计导航场景相关的既有 focused 失败，因此当前里程碑应如实记为：**本轮新前端切片与真实 API 验证已完成，但共享控制台全局前端测试基线尚未完全恢复，下一前端优先项必须先继续清理 `App.test.tsx` / 管理员审计导航旧失败，再继续推进后续页面壳细化与 Phase 4/5 前端闭环。**
- 本轮已先完成一个前端测试基线修复里程碑：共享控制台 `App.test.tsx` 已对齐当前 new-api 风格页面契约，把注册后进入 API Keys 的断言从过时标题 `API Keys` 收敛为实际页面标题 `开发者 API 接入工作台`，并把 Webhook 管理页的存在性检查从宽泛文本匹配收紧为 `发送测试投递` 按钮的可访问角色断言，避免 focused Vitest 在页面文案升级后继续误报。
- 控制器已重新通过 `pnpm --dir web test -- src/App.test.tsx src/pages/AdminAuditPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway` 与 `GET /healthz`；并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`，以及浏览器壳对应的 `GET http://127.0.0.1/docs` / `GET http://127.0.0.1/openapi/index.html` 200，确认注册后普通用户共享菜单、API Keys / Webhooks 工作台入口与文档壳链路仍成立。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；本次 diff 仅修正前端 focused 测试断言，不引入新的运行时逻辑。保留前端 chunk 体积告警、Semi UI `findDOMNode` 与既有 Testing Library `act(...)` 噪声为后续非阻塞债务。

- 本轮已完成新的前端优先纵向切片：`AdminRiskPage` 与 `AdminAuditPage` 已同步升级为 **Risk Mission Control** / **Audit Mission Control** 深色共享控制台页面，在单一登录后壳内把真实风险信号、规则编辑、审计回放、高危运营后果与接入复盘收敛到同一条管理员运营路径；继续保持角色差异只体现在菜单、权限与局部 CTA，不新增独立风控后台或独立审计后台。
- 已新增 `web/src/pages/AdminRiskPage.test.tsx` 与 `web/src/pages/AdminAuditPage.test.tsx`，覆盖：Risk / Audit Mission Control 深色壳渲染、共享控制台桥接、管理员主任务流导航（风控↔审计↔资金工作台↔API Keys）以及规则保存 / 审计筛选等 focused 回归；同时同步更新 `web/src/App.test.tsx` 对新页面标题与导航入口的断言。
- 控制器已通过 `pnpm --dir web test -- src/pages/AdminRiskPage.test.tsx src/pages/AdminAuditPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`、`GET /api/v1/auth/api-keys`、`GET /docs`，验证注册后共享控制台链路、管理员风险/审计页面依赖的真实接口契约与文档入口保持可用。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；代码质量与测试/可靠性评审存在跨仓库污染结果，已按仓库隔离规则丢弃并改由控制器完成针对当前 diff 的三轮直接复核（Focused Vitest / build / real API 回放）后通过。保留前端 chunk 体积告警、Semi UI `findDOMNode` 与既有 Testing Library `act(...)` 噪声为后续非阻塞债务。

- 本轮已完成新的前端优先纵向切片：`ApiDocsPage` 已升级为 **Docs Mission Control** 深色共享控制台页面，在单一登录后壳内把 OpenAPI / Redoc、API Keys、Webhook 联调与真实业务回放收敛为同一条文档→接入→验证路径；继续保持角色差异只体现在 copy / CTA / 菜单权限，不新增独立文档后台或第二套登录壳。
- 已新增 `web/src/pages/ApiDocsPage.test.tsx`，覆盖：普通用户 Docs Mission Control 文案、API Keys 导航、嵌入式 Redoc iframe，以及管理员视角下文档页保留 API 契约与共享控制台叙事、但不暴露缺失的 Webhook 快捷入口。
- 控制器已通过 `pnpm --dir web test -- src/pages/ApiDocsPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /docs`，验证注册后普通用户仍能在共享控制台菜单中看到 `/docs`、`/api-keys`、`/webhooks` 并访问文档壳页面。
- 本轮五维评审结论：产品/规格评审曾指出 `Timeline.Item type=solid` 为 Semi UI 非法值，现已改为合法 `ongoing` 并复验通过；代码质量、安全/集成、测试/可靠性、性能/运维评审通过。保留前端 chunk 体积告警、Semi UI `findDOMNode` 与既有 React Testing Library `act(...)` 噪声为后续非阻塞债务。

### 最新执行检查点（2026-04-30）
- 本轮已完成新的前端优先纵向切片：`SupplierDomainsPage` 升级为 **Supplier Domain Mission Control** 深色共享控制台页面，在单一登录后壳内把域名状态、Catch-All 覆盖、区域 readiness、资源映射下一步与共享接入入口收敛到同一条供应商域名运营路径；同时新增供应商主任务流、控制台能力矩阵与共享控制台联动卡片，继续保持 API Keys / Webhook / Docs / 供应商结算都在同一套 new-api 风格单壳中联动，而不拆第二个供应商后台。
- 已补齐 `web/src/pages/SupplierDomainsPage.test.tsx` 与 `web/src/App.test.tsx` focused 回归，覆盖：Supplier Domain Mission Control 深色壳渲染、真实域名池摘要与 region 归一化统计、供应商主任务流导航、共享控制台联动 CTA 到 API Keys / 供应商结算，以及从现有应用入口跳转到新域名工作台的断言。
- 控制器已通过 `pnpm --dir web test -- src/pages/SupplierDomainsPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、普通注册用户 `GET /api/v1/supplier/resources/overview`（预期 403）与管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/supplier/resources/overview`（200 且返回真实 domain/account/mailbox 数据），确认新的域名运营工作台未破坏共享控制台链路且供应商角色边界仍由真实 API 保持。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维通过；代码质量评审曾指出区域统计对空 region 的归一化不一致与共享联动 CTA 标签过于通用，现已改为与区域分布一致的 `unknown` 归一化计数，并为共享联动按钮补上唯一可访问标签与对应导航断言后复验通过；保留既有 Semi UI `findDOMNode` / Testing Library `act(...)` 噪声与前端 chunk 体积告警为后续非阻塞债务。
- 本轮已完成新的前端优先纵向切片：`SupplierSettlementsPage` 已升级为 **Supplier Finance Mission Control** 深色共享控制台页面，在单一登录后壳内把待结算余额、冻结资金、成本模型、项目报表与争议处理收敛为同一条供应商财务闭环；同时新增供应商资金任务流与共享控制台联动卡片，将资源页 / 供货规则 / API Keys / Webhook / Docs 保持在同一套 new-api 风格单壳路径中，而不拆第二个供应商后台。
- 已新增 `web/src/pages/SupplierSettlementsPage.test.tsx`，覆盖：Supplier Finance Mission Control 深色壳渲染、真实财务数据加载、供应商资金任务流导航、成本模型保存与争议提交流程。
- 控制器已通过 `pnpm --dir web test -- src/pages/SupplierSettlementsPage.test.tsx src/pages/SupplierResourcesPage.test.tsx src/pages/SupplierOfferingsPage.test.tsx src/utils/consoleNavigation.test.ts src/components/ConsoleLayout.test.tsx src/pages/LoginPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与普通注册用户访问 `GET/POST /api/v1/supplier/settlements`、`/api/v1/supplier/cost-profiles`、`/api/v1/supplier/reports`、`/api/v1/supplier/disputes` 的预期 403 验证，确认新的供应商财务工作台未破坏共享控制台链路且供应商角色边界仍由真实 API 保持。
- 本轮五维评审结论：产品/规格初审指出“本周期流水”措辞会夸大已加载列表的统计语义，现已改为“当前列表流水”；共享接入叙事也已收敛为“共享控制台入口”，避免把财务角色误写成直接负责接入配置。代码质量、安全/集成、测试/可靠性、性能/运维复验通过；保留既有 Semi UI `findDOMNode` / Testing Library `act(...)` 噪声与前端 chunk 体积告警为后续非阻塞债务。
- 本轮已完成新的前端优先切片：`BalancePage` 升级为 **Finance Mission Control** 深色共享控制台工作台，新增资金任务流、控制台能力矩阵与角色差异说明，保持单一登录后壳并把预算确认 → 订单追踪 → API Keys / Webhook / Docs 串成一条共享路径；同时将“最近争议”表述收敛为“本次会话新提交的争议”，避免把本地前端 state 误写成服务端事实，并把管理员后续处理文案改为共享控制台运营链路而非错误指向具体页面。
- 已补齐 `web/src/pages/BalancePage.test.tsx`，覆盖普通用户 Finance Mission Control 文案、供应商/管理员角色差异提示，以及充值 / 争议表单提交流程；当前 focused 测试仍以稳定断言为主，后续再继续补强共享路由点击导航断言。
- 控制器已通过 `pnpm --dir web test -- src/pages/BalancePage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`、前端 `/` / `/docs` 可用性检查，以及真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/wallet/overview`、`GET /api/v1/wallet/transactions`、`POST /api/v1/wallet/topups`、`POST /api/v1/wallet/disputes/999999`（预期 400 错误路径）验证当前余额工作台未破坏共享控制台与真实资金接口契约。
- 五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性均在首轮指出阻塞问题后已完成整改并复验通过；性能/运维维度通过，保留全局 chunk 体积告警与 Semi UI `findDOMNode` / 既有 `act(...)` 噪声为后续非阻塞债务。
- 已完成新的前端优先纵向切片：`LoginPage` 在注册 CTA 区新增 “Shared Console / Integration / Docs” 三段式接入路径卡片，明确注册后继续沿 **API Keys → Webhooks → Docs** 的单一深色共享控制台完成首次集成，而不新增第二套后台或额外注册字段。
- 已新增 `web/src/pages/LoginPage.test.tsx`，覆盖：注册 CTA 打开注册模式、注册成功后持久化共享控制台会话并跳回 `/`、确认密码不一致时阻止提交。
- 控制器已通过 `pnpm --dir web test -- src/pages/LoginPage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/SettingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose config` 与 Docker Compose 重建验证当前前端切片可构建、可测试、且未破坏后端主链路。
- 已完成真实 API 回放：`POST /api/v1/auth/register`、`GET /api/v1/auth/me`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`POST /api/v1/auth/api-keys`、`PATCH /api/v1/auth/api-keys/:id/whitelist`（非法 400 / 合法 200）、`POST /api/v1/webhooks/endpoints`、`GET /api/v1/webhooks/endpoints`、`POST /api/v1/webhooks/endpoints/:id/test-delivery`、`GET /api/v1/webhooks/endpoints/:id/deliveries`、`GET /api/v1/dashboard/overview/api-key`、`GET /docs`，验证注册后用户确实能沿共享控制台接入链路进入 API Key / Webhook / Docs。
- 五维评审结论：当前切片可提交；非阻塞后续项为继续减少 Semi UI / Testing Library 的 `act(...)` / `findDOMNode` 噪声，并在下一前端切片里把 Login / Dashboard / Settings / API Keys / Webhooks 的接入叙事进一步统一。
- 本轮已完成 `ProfilePage` 前端深色共享控制台深化：将个人资料页升级为 **Profile Mission Control**，在单一登录后壳内新增账号中枢头部、角色扩展说明与共享桥接能力卡片，把用户侧采购 / API Keys / Webhooks / Docs 入口与供应商 / 管理员的角色扩展说明统一收敛到同一页，而不引入独立后台或本地角色升级假象。
- 已补齐 `web/src/pages/ProfilePage.test.tsx`，覆盖：用户视角深色账号中枢与 API Keys / Webhooks / Docs 导航按钮、供应商/管理员角色扩展文案不泄露普通用户采购叙事，并验证回退到共享工作台的入口仍受现有菜单约束。
- 控制器已通过 `pnpm --dir web test -- src/pages/ProfilePage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose config`、`docker compose up -d --build`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/me`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 与前端 `/profile`、`/api-keys`、`/webhooks`、`/docs` 页面 200 验证 Profile 切片未破坏共享控制台联通性。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；测试/可靠性初审指出 capability card 导航断言不足后已立即补测并复验通过；非阻塞后续项为把 `ProfilePage` 中 `'/supplier/domains'`、`'/admin/risk'` 等字面路由继续收敛到共享导航常量，并在后续切片继续减少 Semi UI `findDOMNode` / React Router future warning 噪声。
- 本轮已完成新的前端优先纵向切片：`AdminProjectsPage` 已升级为 **Admin Pricing Mission Control** 深色共享控制台工作台，将原 Phase 2 的管理员项目配置页收敛为 new-api 风格单壳管理端页面；在同一登录后控制台内新增管理员任务流、控制台能力矩阵、价格策略头部与供应商报价/库存映射观察，明确把项目定价、成功率、超时与后续风控 / 审计 / API Keys / Webhooks / Docs 入口串成一条共享运营路径，而不是额外拆分独立后台。
- 已新增 `web/src/pages/AdminProjectsPage.test.tsx`，覆盖：管理员深色价格策略工作台文案与能力矩阵、风控/审计/API Keys 三段式任务卡真实导航，以及项目配置表单提交到 `/api/v1/admin/projects/:id` 的 focused 回归。
- 控制器已通过 `pnpm --dir web test -- src/pages/AdminProjectsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并通过真实 API 回放 `GET /api/v1/auth/menu`、`GET /api/v1/admin/projects`、`GET /api/v1/admin/projects/offerings`、`PATCH /api/v1/admin/projects/:id`（更新后立即 restore）、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs` 验证管理员价格策略页依赖的共享控制台入口和真实管理端接口契约保持可用。
- 本轮五维评审结论：产品/规格与代码质量通过；安全/集成、测试/可靠性、性能/运维评审未发现当前前端切片新增阻塞问题。评审中出现的阻塞反馈均来自其他仓库上下文，已按仓库隔离规则判定为污染结果并丢弃，不作为本切片 blocker；当前非阻塞后续项为继续把更多管理页收敛到同级深色壳视觉，并在后续切片处理中长期 chunk 体积告警与 Semi UI `findDOMNode` / React Router future warning 噪声。
- 本轮已完成新的前端优先切片：`LoginPage` 与 `WebhooksPage` 继续向 new-api 风格深色单壳控制台收敛。登录/注册页新增“注册后首轮接入建议”与三段式 Integration Runway，把注册 → API Keys → Webhooks → Docs 的首轮接入叙事留在同一控制台中；Webhook 页新增普通用户“首轮回调联调建议”卡片，强调 endpoint 创建、test delivery 与按返回投递状态完善接入检查表，避免夸大为固定时限或前端无法证明的后端保证。
- 已补齐 `web/src/pages/LoginPage.test.tsx`、`web/src/pages/WebhooksPage.test.tsx` focused 回归，覆盖新的共享接入文案、注册 CTA 切换、注册成功落回共享控制台，以及普通用户 Webhook 首轮联调建议卡片展示。
- 控制器已重新通过 `pnpm --dir web test -- src/pages/LoginPage.test.tsx src/pages/WebhooksPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并通过真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/me`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /login` 前端壳可达性，以及 `POST /api/v1/webhooks/endpoints` 的域名不可解析 400 真实错误路径、`GET /api/v1/webhooks/endpoints` 列表查询，验证新的注册后接入叙事未破坏共享控制台与真实 Webhook 契约。
- 本轮五维评审结论：产品/规格与安全/集成初审曾指出“90 秒 / 15 分钟内完成”及时限式联调承诺会夸大前端无法证明的后端保证，现已改写为“首轮接入建议 / 回调联调建议”并复验通过；代码质量评审通过，仅保留登录页三段 onboarding 区块存在轻微文案重复为非阻塞债务；测试/可靠性评审通过，保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与 React Router future warning 噪声为后续清理项；性能/运维评审通过，保留前端大 chunk 告警为后续非阻塞优化项。
- 本轮已完成新的前端优先纵向切片：`AdminSuppliersPage` 升级为 **Supplier Mission Control** 深色共享控制台页面，在单一登录后壳内把高待结算、低履约风险、争议敞口与共享接入桥接收敛为同一管理员供应商运营工作台；新增管理员主任务流卡片，统一从该页回流到结算/争议、风控与审计动作，并明确 API Keys / Webhook / Docs 仍属于同一共享控制台链路，而不是拆分额外后台。
- 已补齐 `web/src/pages/AdminSuppliersPage.test.tsx` focused 回归，覆盖：Supplier Mission Control 文案、高待结算/风险/接入桥接展示，以及从该页进入结算 / 风控 / 审计页面的代表性导航断言；同时修正共享路由常量 `API_KEYS_ROUTE` 与 `visibleQuickActionPaths` 导出，保持 `ConsoleLayout` 与 onboarding 路径常量一致。
- 控制器已通过 `pnpm --dir web test -- src/pages/AdminSuppliersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose config`、`docker compose up -d --build web api gateway`、`GET /healthz`，以及真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/me`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，验证新的管理员供应商运营切片未破坏共享控制台注册后链路与真实管理端接口契约。
- 本轮五维评审结论：产品/规格初审曾指出共享接入桥接中的 API Keys 路径常量漂移，现已修复 `API_KEYS_ROUTE='/api-keys'` 并复验通过；代码质量、安全/集成、测试/可靠性、性能/运维评审通过，保留 `ConsoleLayout.test.tsx` 旧断言与 Semi UI `findDOMNode` / React Router future warnings / 前端大 chunk 告警为后续非阻塞债务。
- 本轮已完成新的前端优先纵向切片：`AdminUsersPage` 已升级为 **Admin Finance Mission Control** 深色共享控制台页面，在单一登录后壳内把钱包调账、供应商待结算确认与争议处理收敛为同一管理员资金运营工作台；新增管理员主任务流与共享接入桥接，统一把风险 / 审计 / API Keys / Webhook / Docs 保留在同一控制台，而不是拆分独立后台。
- 已补齐 `web/src/pages/AdminUsersPage.shared-console.test.tsx`，覆盖：Admin Finance Mission Control 文案、从该页进入风控 / 审计 / API Keys 的代表性导航断言，以及现有调账 / 结算 / 争议处理提交流程；同时补齐 `web/src/pages/AdminUsersPage.test.tsx` 的 Router 包裹，并恢复 `web/src/utils/consoleNavigation.tsx` 中被共享侧边栏、布局与 landing 规则测试依赖的导航辅助函数。
- 控制器已通过 `pnpm --dir web test -- src/utils/consoleNavigation.test.ts src/pages/AdminUsersPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx src/components/ConsoleLayout.test.tsx src/App.test.tsx`、全量 `pnpm --dir web test`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并通过真实 API 回放 `GET /healthz`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/me`、管理员 `POST /api/v1/admin/wallet-adjustments`（缺失确认 400 / 正确确认 200）、`POST /api/v1/admin/supplier-settlements`（缺失确认 400）、`GET /api/v1/admin/disputes?limit=5`，以及前端 `/`、`/admin/users`、`/api-keys`、`/webhooks`、`/docs` 页面 200，验证新的管理员资金运营切片未破坏共享控制台与真实账务/争议接口契约。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维已全部复验通过；保留前端大 chunk 告警、Semi UI `findDOMNode` 与 React Router future warnings 为后续非阻塞债务，下一前端优先项转为继续把 `SupplierDomainsPage` / 其余较旧页面收敛到同级深色 mission-control 壳。


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
8. 仪表盘统计（已完成深度统计里程碑：管理员 `/api/v1/admin/overview` 输出订单完成/超时/取消率、完成订单流水、平均完成客单价、争议发生率、鉴权拒绝总数/拒绝率；本轮补强供应商待结算与运营表现排行，overview `suppliers` 数组仅返回 supplier 角色主体并按待结算金额降序排序，同时输出每个供应商订单总数、完成/超时/取消数、完成订单流水与完成率 bps，前端 Dashboard 展示供应商 ID/邮箱/待结算金额/订单状态拆分/完成率/完成流水，OpenAPI 契约同步更新；已通过真实 API 验证 admin 200、普通用户 403、供应商列表结构与运营指标字段）

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
