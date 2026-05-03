# Nexus-Mail 完整开发计划（todo.md）

> **执行模式已切换：** 本文档不再只是规划稿，而是当前仓库的**执行中路线图**。后续提交必须对照阶段目标更新状态，并在阶段完成后进入下一阶段。

## 执行状态看板（持续维护）

### 当前总体进度
- Phase 0：**已完成**（开发底座、Docker、多服务骨架已提交）
- Phase 1：**已完成**（身份权限、共享控制台骨架已提交）
- Phase 2：**已完成**（项目/库存/激活订单主链路、管理员项目配置、供应商资源录入已提交）
- Phase 3：**已完成**（已完成 SMTP 会话落盘、metadata 入库、RabbitMQ 解析任务入队、MinIO 原始对象上传，并打通验证码/link 提取回退增强、订单 READY/FINISHED 自动迁移、真实 OAuth2 刷新接入、授权码/App Password/密码型凭证录入与健康状态落库、`env://` secret_ref 解析、IMAP/POP3 实际登录校验、官方邮箱端点限制、Proton Bridge 接入策略与 Postfix 转发样例）
- Phase 4：进行中（已完成用户钱包、冻结余额、成功扣费、超时退款、供应商待结算余额、管理员调账能力与基础结算页面；已完成供应商报表筛选、供货规则维护、管理员争议单显式筛选、供应商域名运营页、管理员供应商运营页与共享控制台深色单壳导航收敛；已完成 Webhooks / 风控 / 审计真实页面收敛与对应真实 API 回放验证；本轮继续优先补全注册后前端工作台首轮引导：保持单一登录后控制台与 new-api 风格深色壳不变，在 `DashboardPage` 为普通用户增加注册后共享控制台首轮任务卡（采购 / API 接入 / 角色扩展说明），并在 `SettingsPage` 增加“首次使用清单”与“重新打开首轮引导”回入口；补齐 `App.test.tsx` 覆盖注册成功后首轮任务卡展示、引导关闭后从设置页重新打开、普通用户首轮引导不泄露供应商/管理员任务文案；控制器依据五维评审整改，移除 `DashboardPage` 未使用回入口辅助函数、统一 Dashboard/Settings 首轮引导路由常量，并将角色扩展文案改为“后续被服务端授予角色”以避免把本地引导误写成服务端事实；已通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、Docker Compose 重建后的真实 API `/healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/me` 验证普通用户共享菜单与页面入口仍可用；当前前端后续重点转为继续收敛定向 Vitest 选择范围与更多共享控制台页面细化；本轮已将 SettingsPage 升级为贴近 new-api / Linear 深色共享控制台的 Console Mission Control：新增深色任务总览、集成任务流（API Keys / Webhook / Docs）与控制台能力矩阵，保留普通用户首次使用清单与角色差异快捷入口；补齐 `SettingsPage.test.tsx` 对深色控制台入口、规范化共享路由导航与供应商场景抑制首轮清单的 focused 回归；已通过 `pnpm --dir web build`、`go test ./...`、Docker Compose 重建后真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/settings` 页面访问验证注册后共享控制台接入链路仍成立；下一前端优先项转为继续清理共享控制台 focused Vitest 噪声与补强更多页面的深色壳一致性；本轮已修复共享控制台 API Keys 路由真值漂移，恢复 `API_KEYS_ROUTE` 与 `/api-keys` 一致，并将 Dashboard / Settings / Profile / Orders 内相关 CTA 与菜单判断统一收口到共享路由常量；补齐 `App.test.tsx`、`ProfilePage.test.tsx`、`OrdersPage.test.tsx` 对注册后 onboarding、资料页与订单空态进入 API Keys 页的真实导航断言；已重新通过 `pnpm --dir web test -- src/App.test.tsx src/pages/ProfilePage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ProjectsPage.test.tsx src/components/ConsoleLayout.test.tsx`、`pnpm --dir web build`，并在 Docker Compose 重建后通过真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 验证注册后普通用户共享菜单仍包含 `/api-keys` 等基础接入入口；当前前端后续重点继续转向共享工作台 CTA 叙事统一，而不是回退为分裂式独立后台；本轮继续以“前端优先 + 单壳共享控制台”推进 focused 测试去脆弱化：已为 `ProjectsPage` 首轮采购 lane、`OrdersPage` 履约续接 lane、`BalancePage` 资金任务流与 `SupplierOfferingsPage` 共享控制台联动区补充稳定语义锚点，并将对应 focused 回归从 `.closest('.semi-card')` / `parentElement` 结构耦合切换为 `data-testid` + `within(...)` 或直接按钮锚点，不改变 new-api 风格深色单壳、角色菜单 gating 与 CTA/fallback 运行时合同；控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/BalancePage.test.tsx src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/wallet/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/settings`、`/projects`、`/orders`、`/api-keys`、`/docs`、`/supplier/offerings` 壳 200，确认新的语义锚点没有破坏注册后共享菜单、真实 API 契约与单壳前端入口；当前前端下一优先项转为继续清理其余共享控制台页面中残留的 `.closest('.semi-card')` / `parentElement` 测试耦合，再回到 Phase 4/5 其余后端能力）
- Phase 5：进行中（本轮补强管理员高危操作二次确认：`POST /api/v1/admin/wallet-adjustments` 必须携带 `confirmation_phrase=确认调账`，`POST /api/v1/admin/supplier-settlements` 必须携带 `confirmation_phrase=确认结算`，后端在账务副作用前校验，前端表单与 OpenAPI 契约同步更新，并已通过真实 API 验证缺失确认 400、正确确认调账 200 与审计可查；已接入 OpenAPI 3 初始规范文件与 `/docs` Redoc 页面；已补齐管理员 `/api/v1/admin/audit` 审计查询接口，可基于真实 API 回放查询 API Key 生命周期与鉴权事件；已交付管理员 `/api/v1/admin/overview` 真实聚合概览、`/api/v1/admin/risk` 风险信号汇总，以及前端管理端风控/审计/仪表盘真实数据页面；已补强 API Key 创建默认最小权限：省略 scopes 时默认 `activation:read`、显式空白 scopes 拒绝，并通过真实 API Key 创建/使用/撤销回放验证；已交付 API Key IP 白名单管理里程碑：支持 `PATCH /api/v1/auth/api-keys/:id/whitelist` 更新白名单、规范化 IP/CIDR、写入 `update_whitelist` 审计并可由管理员审计接口筛选，已通过真实 API 回放验证更新前 403、更新后 200；本轮补齐共享控制台前端白名单编辑闭环：`/api-keys` 页面新增“编辑白名单”入口，保持单一登录后控制台与角色扩展文案一致，支持回填/清空/失败提示，并补齐 Vitest 覆盖与真实 API 验证注册→菜单→创建 Key→非法白名单 400→合法白名单 200→管理员审计 `update_whitelist` 查询；已交付 API Key 运行时限流首个里程碑：同一 API Key 每分钟 60 次后返回 429 并写入 `denied_rate_limit` 审计；本轮补强为 Redis 全局计数限流，API 启动时连接 `REDIS_URL` 并使用 Lua 原子 `INCR` + `PEXPIRE` + TTL 修复，按稳定 API Key ID 计数并哈希 Redis key，支持独立限流超时、Redis 连接池/读写超时配置、`/healthz` Redis readiness，后端故障脱敏返回 503 并记录 `rate_limit_backend_error` 审计；真实 API 连续 70 次请求验证 60 次 200、10 次 429、Redis key 带 TTL、`/healthz` 返回 `redis=ok`、管理员审计可查询 `denied_rate_limit` 与 `rate_limit_backend_error`；已交付 API Key 商业下单写权限入口：新增 `POST /api/v1/orders/activations/api-key`，仅接受包含 `activation:write` scope 的 API Key，复用白名单/限流/审计链路并补充 OpenAPI `apiKeyAuth` 文档，真实 API 验证 read-only 403、write-scope 201 创建订单；已交付 Webhook 配置、重试可观测性与异步真实投递里程碑：用户鉴权下 endpoint 创建/列表、一次性签名 secret、secret_preview 列表脱敏、SSRF URL 拦截、test-delivery 创建 pending delivery 并由独立 webhook-worker 异步真实 POST，携带 HMAC-SHA256 签名，2xx 标记 sent，失败按指数退避重试并支持陈旧锁回收，同时新增 `GET /api/v1/webhooks/endpoints/:id/deliveries` 查询当前用户 endpoint 的最近投递/重试记录；已交付可配置风控规则首个里程碑：新增 `GET/PUT /api/v1/admin/risk/rules`、`risk_rules` schema/default seed、前端风控规则表格编辑、`update_risk_rule` 管理员审计、OpenAPI 文档，并通过真实 API 验证默认规则、非法阈值 400、更新后持久化）
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

### 最新执行检查点（2026-05-03）
- 本轮继续按“前端优先”清理 `AdminUsersPage.shared-console.test.tsx` 中残余的多次挂载 Router 树耦合：已在管理员资金工作台导航用例中显式引入 RTL `cleanup()`，并在“查看风控中心 → 查看审计日志 → 打开 API Keys”三段导航之间执行 fresh remount，避免同一测试内保留多份共享控制台渲染树后再次误判重复 CTA / 路由结果；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实账务/审计/API Keys 路由合同不变，而不是继续依赖多次 `render(...)` 叠加后的偶然 DOM 状态。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminUsersPage.shared-console.test.tsx`、补充回归 `pnpm --dir web exec vitest run src/pages/ProfilePage.test.tsx src/pages/LoginPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_admin_users_real_api.sh`（产物目录 `real-api-admin-users-20260503-112559`），确认 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/admin/users` 壳 200 均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格 PASS、代码质量 APPROVED、安全/集成 SAFE、测试/可靠性 PASS、性能/运维 PASS；评审一致认为当前 diff 仅修复管理员资金工作台测试内的重复挂载污染，不改变运行时权限、路由或后端合同。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中的重复 `render(...)` / 多棵 Router 树耦合，再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”清理 `SupplierDomainsPage` focused 回归中的残余全局状态计数耦合：已将域名表卡片内 `已开启 / 未开启` 的宽泛 `getAllByText(...).length` 断言收敛为按具体域名行定位后再校验 Catch-All 状态，变量名同步明确为 `catchAllEnabledRows / catchAllDisabledRows`，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实域名运营合同不变，而不是继续依赖卡片内重复状态文本的全局数量。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierDomainsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-104053`），确认 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/supplier/domains` 壳 200 均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均直接通过；代码质量与测试/可靠性评审仅提出一项轻量整改——避免把 Catch-All 状态变量误命名为通用 enabled/disabled 状态，控制器已改为 `catchAllEnabledRows / catchAllDisabledRows` 后复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、以及前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的重复状态文案 / 行级语义耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”补齐 `SupplierOfferingsPage` 的 supplier mission-control runtime 一致性：在不改变单一登录后 new-api 风格深色共享控制台与角色菜单 gating 的前提下，为供货规则页新增与相邻 supplier 页面一致的 mission fallback 卡片；当服务端未暴露资源页、结算页与共享接入入口时，页面不再只剩零散 bridge fallback，而会展示 `supplier-offerings-mission-fallback` 引导返回推荐工作台继续供应商主链路；同时将主任务流卡片按实际 `menu` 过滤，避免资源/结算/API Keys 按钮在未授权时仍渲染。
- 已补齐 `web/src/pages/SupplierOfferingsPage.test.tsx` focused 回归：为多次重新挂载的 mission 导航测试补入显式 `cleanup()`，并新增“无 supplier follow-up routes 时展示 mission fallback 卡片并返回共享控制台首页”的断言，继续保持 shared-console 供应商页不拆独立后台、而是按菜单真值收敛 CTA/fallback 运行时合同。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放脚本 `.hermes/local-output/run_supplier_offerings_real_api.sh`（产物目录 `real-api-supplier-offerings-20260503-110642`）：确认 `GET /healthz`（200，`redis=ok`）、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/supplier/offerings` 壳 200 均保持成立。
- 本轮五维评审结论：产品/规格 PASS、代码质量 APPROVED、安全/集成 SAFE、测试/可靠性 PASS、性能/运维 PASS；评审一致认为当前 diff 仅为 supplier offerings 页补齐 mission fallback 与对应 focused 回归，不引入新的权限、运行时或部署风险。继续保留既有 Semi UI `findDOMNode`、`async-validator` 控制台噪声与前端 chunk 体积告警为非阻塞债务；下一前端优先项转为继续补齐 `SupplierDomainsPage` 的 runtime fallback 卡片一致性，再回到其余 shared-console 页面与 Phase 4/5 后端能力。

- 本轮继续按“前端优先”清理 `SupplierSettlementsPage` focused 回归中的残余共享 fallback 语义盲区：已为共享控制台 fallback 按钮补充最小化 `data-testid="supplier-settlements-shared-console-fallback-button"` 语义锚点，并将 `web/src/pages/SupplierSettlementsPage.test.tsx` 从仅断言卡片存在，补强为先点击共享接入 fallback 再复位并验证 mission fallback 导航，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实回退导航合同不变，而不是让新增按钮只停留在存在性断言。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierSettlementsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-101310`），确认 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/supplier/settlements` 壳 200 均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中安全/集成评审首轮仅指出新增共享 fallback 按钮需要从“存在性断言”升级为真实点击导航覆盖，控制器已补入共享 fallback 点击 + `cleanup()` 后重新验证 mission fallback 的 focused 用例并复验通过。继续保留既有 Semi UI `findDOMNode`、async-validator `currency is required` 控制台噪声与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的“新增语义锚点只校验存在、不校验导航”盲区，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按“前端优先”清理 `AdminProjectsPage` focused 回归中的残余 fallback CTA 全局查询耦合：已将管理员价格策略页“返回推荐工作台”用例从宽泛 `getByRole('button', { name: ... })` 收敛为先锁定真实 `admin-pricing-fallback-button` CTA，再单独断言同卡片内的风控回流提示文案，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖全页同名按钮查询。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminProjectsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-091340`），确认普通用户 `/auth/menu` `/auth/me` `/dashboard/overview` `/auth/api-keys` `/webhooks/endpoints` `/projects/inventory` `/orders/activations`、管理员 `/auth/menu` `/admin/overview` `/admin/risk` `/admin/audit?limit=5` 与前端 `/` `/api-keys` `/webhooks` `/docs` `/admin/pricing` 壳 200 均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；首轮评审曾指出 `parentElement` 作用域与未使用 `within` import 会重新引入结构耦合，控制器已改为直接断言用户可见提示文案并移除未使用 import 后复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` / `FormApi.setValues()` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的 fallback CTA 全局查询/重复按钮耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `SupplierDomainsPage` focused 回归中的低信号重复文案断言：已将域名表卡片内原本宽泛的 `getAllByText('已开启').length > 0` 收紧为基于真实 overview fixture 的表格 scoped 断言，明确验证四条域名记录均落入 `supplier-domains-table-card`，并校验 Catch-All 标签拆分为 `已开启 x2 / 未开启 x2`，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实域名运营合同不变，而不是继续依赖重复状态文案的存在性检查。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierDomainsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-093449`），确认 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/supplier/domains`、`/admin/risk`、`/admin/audit` 壳 200，新的 SupplierDomains 表格 scoped 断言未破坏注册后共享菜单、管理员真实运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅把 `SupplierDomainsPage.test.tsx` 中低信号的重复状态存在性断言收敛为表格作用域内的真实记录与状态分布校验，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、风控页局部控件告警与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的重复 `getAllByText(...)` / 低信号存在性断言，再回到 Phase 4/5 其余后端能力。


- 本轮继续按“前端优先”清理 shared-console focused 回归中的残余空态 fallback 全局按钮查询耦合：已为 `WebhooksPage` 空态动作区补充最小化 `data-testid="webhooks-empty-state-actions"` 语义锚点，并将 `web/src/pages/WebhooksPage.test.tsx` 与 `web/src/pages/OrdersPage.test.tsx` 中“返回推荐工作台”断言统一收敛为 `within(empty-state-actions)` 作用域查询，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖全页同名 CTA 查询。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/OrdersPage.test.tsx src/pages/WebhooksPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放（产物目录 `real-api-frontend-priority-20260503-085112`）：`GET /healthz`（200，`redis=ok`）、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，以及前端 `/`、`/orders`、`/webhooks` 壳 200 校验，确认新的空态 scoped 查询没有破坏注册后共享菜单、真实接入接口、管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅为 Webhooks 空态补充最小语义锚点并把 Orders/Webhooks fallback 查询收敛到真实空态动作区，未引入新的运行时、权限、构建或部署风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的全局 fallback CTA / 重复按钮查询耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"清理 `App.test.tsx` 管理员 Dashboard 深统计用例中的残余 `.closest('.semi-card')` 结构耦合：已在 `DashboardPage` 对“当前重点关注供应商”“供应商待结算排行”“争议发生率”“已完成订单流水”四个精确卡片补充最小化 `data-testid` 语义锚点，并将 `App.test.tsx` 改为通过 `getByTestId(...)` + `within(...)` 锁定对应卡片，不再依赖 Semi UI 包装层 DOM 结构；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航/真实 API 合同不变，而不是为了测试稳定性改动运行时权限或路由。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行真实 API / SPA 壳回放（产物目录 `real-api-frontend-priority-20260503-073953`），确认普通用户注册后 `/projects` `/orders` `/balance` `/profile` `/api-keys` `/webhooks` `/settings` `/docs` 菜单与接口、管理员 `/admin/suppliers` `/admin/risk` `/admin/audit` 真实接口，以及对应前端单壳路由 200 校验均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅为管理员 Dashboard 精确卡片增加稳定测试锚点并替换脆弱 `.closest('.semi-card')` 查询，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中残留的 `.closest(...)` / 结构选择器耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"收敛 shared-console focused 回归中残余的全局统计计数/重复挂载耦合：已将 `App.test.tsx` 的管理员 Dashboard 深统计用例从脆弱的 `getAllByText(...).length` 计数断言改为基于真实卡片/表格作用域的可见数据断言，并为管理员风控→审计双路由渲染补入显式 `unmount()`，避免同一测试残留多棵 Router 树后再误判 `Audit Mission Control` 不可达；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖重复数值文案计数。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx src/pages/SettingsPage.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/AdminSuppliersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`（200，`redis=ok`），并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-071750`），确认新的管理员 Dashboard scoped 断言与路由卸载修复没有破坏注册后共享菜单、普通用户 `/projects` `/orders` `/balance` `/profile` `/api-keys` `/webhooks` `/settings` `/docs` 接入链路、管理员 `/admin/overview` `/admin/risk` `/admin/audit` 真实接口与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中代码质量仅记录 `App.test.tsx` 里 `mockedGetAdminOverview.mockResolvedValueOnce(... as any)` 仍可在后续继续收敛类型辅助，测试/可靠性仅记录既有 Semi UI `findDOMNode`、RTL `act(...)` 与 chunk 体积告警仍为非阻塞债务。下一前端优先项转为继续清理其余 shared-console focused 用例里残留的全局重复统计/文案断言，再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”收敛 shared-console focused 回归中的残余全局重复文案/弱作用域断言：已将 `App.test.tsx` 的供应商首页 CTA 与管理员 Webhook/Audit 断言从宽泛 `getAllBy...` 计数收紧为真实按钮/表格查询，将 `OrdersPage.test.tsx` 的提取结果断言收敛到结果对话框，将 `WebhooksPage.test.tsx` 的最近回调时间收敛到指标区域，并同步收紧 `AdminUsersPage.shared-console.test.tsx`、`AdminSuppliersPage.test.tsx`、`ApiDocsPage.test.tsx`、`SupplierDomainsPage.test.tsx` 中对重复桥接文案、列表状态与概览 copy 的 focused 断言；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖全局重复文本计数。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx src/pages/AdminAuditPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/ApiDocsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx src/pages/AdminSuppliersPage.test.tsx src/pages/SupplierDomainsPage.test.tsx src/pages/ApiKeysPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-064359`，`summary.txt` 已记录普通用户 `/projects` `/orders` `/balance` `/profile` `/api-keys` `/webhooks` `/settings` `/docs` 与管理员 `/supplier/*` `/admin/*` 扩展菜单真值），确认本轮 focused 去脆弱化没有破坏注册后共享菜单、管理员运营接口、供应商扩展页与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中产品/规格仅提示 `OrdersPage` 对话框标题与 `SupplierDomainsPage` 的 `unknown` 区域归一化断言可在后续如需补强时恢复更细 coverage，代码质量仅记录 `WebhooksPage.test.tsx` 仍通过 `.closest('.semi-space')` 锁定最近回调指标、`ApiDocsPage.test.tsx` 与 `AdminUsersPage.shared-console.test.tsx` 仍存在少量 copy-sensitive 断言为非阻塞后续项。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的 UI 库类名作用域/长文案断言耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按“前端优先”清理 shared-console focused 回归中的残余多次挂载/宽泛断言耦合：已将 `AdminAuditPage.test.tsx` 的审计事件断言收敛到实际表格上下文，将 `WebhooksPage.test.tsx` 的首轮联调卡片断言收敛到 `webhooks-first-integration-loop` 语义锚点并在二次导航前显式 `cleanup()`，同时为 `SupplierDomainsPage.test.tsx` 的多跳导航与双 fallback 场景补入 `cleanup()` 并把 `共享控制台首页` 断言从宽泛 `getAllByText(...).length` 收紧为单一路由结果；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖重复挂载树或全局文本计数。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminAuditPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/SupplierDomainsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-061542`），确认新的 focused 测试去脆弱化没有破坏注册后共享菜单、普通用户 `/projects` `/orders` `/api-keys` `/webhooks` `/docs` 接入链路、管理员 `/admin/overview` `/admin/risk` `/admin/audit` 运营接口与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；代码质量/测试可靠性首轮指出 `WebhooksPage.test.tsx` 与 `SupplierDomainsPage.test.tsx` 仍残留二次 `render(...)` 未清理与宽泛首页计数断言后，控制器已补入显式 `cleanup()` 并将首页断言收紧为单一 `findByText('共享控制台首页')` 后复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、React Router future warnings 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中残留的多次挂载/全局文本顺序耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"清理 `SupplierSettlementsPage` focused 回归中的残余 `.semi-card` 结构耦合：已为 `项目报表` 卡片补充稳定 `data-testid="supplier-settlements-reports-card"` 语义锚点，并将 `web/src/pages/SupplierSettlementsPage.test.tsx` 改为通过 `getByTestId(...)` + `within(...)` 锁定报表区域，不再依赖 `screen.getByText('项目报表').closest('.semi-card')` 的 Semi UI 包装层；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierSettlementsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-055803`），确认新的报表卡片语义锚点没有破坏注册后共享菜单、普通用户钱包/项目/API Keys/Webhooks/Docs 接入链路、管理员风控/审计/供应商结算接口与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中代码质量首轮指出引入 `SectionCard` helper 会带来无必要的运行时抽象与 padding 漂移后，控制器已回退为仅在既有 `项目报表` Card 上直接增加 `data-testid` 并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、async-validator `currency is required` 控制台噪声与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的 `.closest('.semi-card')` / 结构选择器耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `SupplierResourcesPage` focused 回归中的残余桥接作用域表达：在不改变任何运行时逻辑与 shared-console/new-api 深色单壳合同的前提下，将 `supplier-resources-shared-console-bridge` 的测试读取改为先显式命名 `sharedConsoleBridge` 再取父级卡片作用域，避免在断言中直接链式混用语义锚点查询与 DOM 父级访问，保持 bridge 区域对 `API Keys / Webhook / Docs` CTA 的 focused 导航合同稳定且更易读。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierResourcesPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-045704`），确认该 focused 测试整理未破坏注册后共享菜单、项目/订单/API Keys/Webhooks/Docs/管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅是 `SupplierResourcesPage.test.tsx` 的局部可读性/维护性收敛，没有引入新的运行时、权限、部署或性能风险。下一前端优先项转为继续清理其余 shared-console focused 用例里残留的 `parentElement` / 顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `SupplierResourcesPage` focused 回归中的残余 bridge 作用域耦合：已将 shared-console bridge 文案/路由断言从 `sharedConsoleBridge.parentElement` 的父级卡片依赖收敛为直接消费既有 `supplier-resources-shared-console-bridge` 语义锚点，并对 `supplier-resources-bridge-api-keys` / `...-webhooks` / `...-docs` 现有按钮 test id 做文本合同断言，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖 DOM 父节点结构。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierResourcesPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-051309`）；控制器复核 `auth_menu.json`、`auth_me.json`、`dashboard_overview.json`、`auth_api-keys.json`、`webhooks_endpoints.json`、`projects_inventory.json`、`orders_activations.json`、`admin_overview.json`、`admin_risk.json` 与 `admin_audit_limit_5.json`，确认注册后共享菜单仍含 `/api-keys`、`/webhooks`、`/docs` 及管理/供应商扩展路径，普通用户/管理员真实 API 与 SPA 单壳入口均保持可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中测试/可靠性复评建议去掉重复的 `共享控制台联动` 全局断言后，控制器已同步收紧为 bridge scoped 断言并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的跨区域作用域/顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”收敛 shared-console focused 回归中的重复文案断言：已将 `ConsoleLayout.test.tsx`、`AdminAuditPage.test.tsx`、`AdminRiskPage.test.tsx`、`SettingsPage.test.tsx`、`SupplierResourcesPage.test.tsx` 与 `SupplierSettlementsPage.test.tsx` 中残留的重复 `getAllByText(...).length` / 宽泛文案匹配收敛为更具体的 breadcrumb / mission-card / bridge scoped 查询，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖重复文案计数。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/components/ConsoleLayout.test.tsx src/pages/SupplierResourcesPage.test.tsx src/pages/SupplierSettlementsPage.test.tsx src/pages/AdminAuditPage.test.tsx src/pages/AdminRiskPage.test.tsx src/pages/SettingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-044240`），确认新的 scoped 文案断言没有破坏注册后共享菜单、管理员真实运营接口、供应商资源/结算入口与 SPA 单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中代码质量/测试/运维复评后已将 `SupplierResourcesPage.test.tsx` 的 bridge 作用域从 `.closest('.semi-space')` 进一步收敛为更轻量的父容器作用域，避免引入新的 UI 库类名耦合。下一前端优先项转为继续清理其余 shared-console focused 用例中残留的重复 `getAllByText(...)` / 过宽文本断言，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”清理 shared-console focused 回归中残留的重复按钮/顺序耦合：已将 `App.test.tsx` 中注册后 onboarding 对 API Keys 入口的断言收敛到 `dashboard-next-steps-lane` 语义锚点内，将 `SettingsPage.test.tsx` 的“重新打开首轮引导”与 Webhook 入口查询收敛为 checklist / mission-cards 作用域内按钮断言，并将 `ProjectsPage.test.tsx` 的“返回推荐工作台”点击固定到 `projects-empty-state-actions` 空态动作区；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖重复按钮顺序或全局查询。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SettingsPage.test.tsx src/pages/ProjectsPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行 Docker/真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`：完成普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`，管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，以及前端 `/`、`/settings`、`/projects`、`/orders`、`/api-keys`、`/webhooks`、`/docs`、`/admin/suppliers` 壳 200 校验，确认本轮 focused 去脆弱化没有破坏注册后共享菜单、真实接入接口、管理员运营接口与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中代码质量与安全/集成仅记录 `SettingsPage.test.tsx` 的 `new RegExp(label)` helper 未来可进一步收紧为更字面量的名称匹配，但当前不构成阻塞；继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务。下一前端优先项转为继续清理其余 shared-console focused 用例中残留的 `getAllByRole(...).length` / 全局重复文案断言耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余全局/顺序选择器耦合：已将 `ConsoleLayout.test.tsx` 的 quick actions 断言从全量按钮过滤收敛为显式快捷入口名称顺序校验，将 `ProjectsPage.test.tsx` 的下单断言改为直接命名按钮校验，并把 `OrdersPage.test.tsx` 与 `App.test.tsx` 中少量残留的重复 CTA 索引访问缩到当前真实可见入口；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/components/ConsoleLayout.test.tsx src/App.test.tsx src/pages/OrdersPage.test.tsx src/pages/ProjectsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，确认新的 selector 去脆弱化没有破坏注册后共享菜单、真实接入接口、管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中测试/可靠性复评已按控制器侧 live diff + focused Vitest 通过结果确认此前关于 `查看审计日志` 的阻塞反馈属于旧 diff 失效结论。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的 `getAllByRole(...)[0]` / 全局重复 CTA 索引耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余表格结构耦合：已将 `web/src/pages/ApiKeysPage.test.tsx` 的行级 helper 从原生 `closest('tr')` 收敛为基于可访问性 `closest('[role="row"]')` 的定位，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖 Semi UI 表格输出原生 `tr` 结构。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiKeysPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`PATCH /api/v1/auth/api-keys/:id/whitelist`（非法 400 / 合法 200）、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/admin/audit?action=update_whitelist&limit=20`，确认新的 ApiKeys 行级 accessible 查询没有破坏注册后共享菜单、真实接入接口、管理员审计接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、性能/运维均通过；测试/可靠性首轮指出为配合该测试修复而新增生产 `rowClassName` 会引入无收益的类型耦合后，已移除该运行时代码并仅保留测试侧 `role="row"` 语义定位，复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中残留的表格/图标 accessible-name 耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余可访问性/作用域耦合：已将 `AppSidebar.test.tsx` 的 Webhook 导航从重复文本索引切换为 `role=menuitem` + `/Webhook 设置/` 的可访问性查询，将 `ApiDocsPage.test.tsx` 的项目市场 bridge 点击统一收敛到既有 `docs-shared-console-bridge` scoped 查询，并保持 `ApiKeysPage.test.tsx` 的行级 helper 只依赖名称定位与 `closest('tr')` 而不额外绑定表格内部 role 细节，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiDocsPage.test.tsx src/components/AppSidebar.test.tsx src/pages/ApiKeysPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/docs`、`/api-keys`、`/webhooks` 壳 200，确认新的 scoped/accessibility 查询没有破坏注册后共享菜单、真实接入接口、管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、性能/运维均通过；测试/可靠性首轮指出 `ApiKeysPage.test.tsx` 新增 `role="row"` 断言会把 helper 过度绑定到 Semi UI 表格内部语义后，已回退该实现细节断言并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中残留的图标污染 accessible name / 结构选择器耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `ProfilePage` focused 回归中的共享桥接区域脆弱选择器：已为 `ProfilePage` 的"控制台桥接能力"卡片补充稳定 `data-testid="profile-capability-bridge"` 语义锚点，并将 `web/src/pages/ProfilePage.test.tsx` 从依赖标题 `.closest(...)` 的区域定位改为 `getByTestId(...)` + `within(...)` scoped 导航断言；同时按测试/可靠性评审整改，在同一测试内对多次 `renderProfilePage()` 之间显式 `cleanup()`，避免多份 Router 树残留导致后续 CTA 查询重新变脆，继续保持 new-api / Linear 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ProfilePage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu` 与前端 `/profile` 壳 200，确认新的 Profile 共享桥接语义锚点没有破坏注册后共享菜单、管理端菜单可达性与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、性能/运维均通过；测试/可靠性首轮指出同一用例内多次 `renderProfilePage()` 可能残留多份渲染树后，已补入显式 `cleanup()` 并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的标题 `.closest(...)` / 跨区域 CTA 作用域脆弱点，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `OrdersPage` focused 回归中的 `.semi-empty` 结构耦合：已为订单空态 CTA 容器补充稳定 `data-testid="orders-empty-state-actions"` 语义锚点，并将 `web/src/pages/OrdersPage.test.tsx` 改为通过 `getByTestId(...)` + `within(...)` 锁定空态动作区，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖 Semi UI Empty 包装层。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/OrdersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/orders`、`/api-keys` 壳 200，确认新的 Orders 空态语义锚点没有破坏注册后共享菜单、真实接入接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅把 OrdersPage 空态 focused 测试从 `.semi-empty` 的脆弱结构依赖收敛为稳定语义锚点，未引入新的运行时/权限/部署风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的 `.semi-empty` / 重复按钮顺序耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `SupplierSettlementsPage` focused 回归中的重复文本弱断言：已将供应商项目报表用例里对 `discord` 的宽泛 `getAllByText(...).length` 检查收敛为先锁定 `项目报表` 卡片、再在卡片作用域内执行精确文本断言，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变，而不是继续依赖全页重复文本计数。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierSettlementsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-053906`），确认新的报表卡片 scoped 断言没有破坏注册后共享菜单、普通用户钱包/项目/API Keys/Webhooks/Docs 接入链路、管理员风控/审计/供应商结算接口与 SPA 单壳入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中产品/规格与代码质量首轮反对把 test-only `data-testid` 加入生产表格后，控制器已回退该运行时代码，改为以现有 `项目报表` 卡片为作用域完成 focused 断言并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、a

... [OUTPUT TRUNCATED - 32466 chars omitted out of 82466 total] ...

/supplier/settlements`（预期 403）、`GET /api/v1/auth/api-keys`（200）、`GET /api/v1/webhooks/endpoints`（200），以及管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/supplier/settlements`（200）与前端 `/supplier/settlements` 壳 200，确认新的供应商结算页权限抑制没有破坏注册后普通用户共享菜单、管理员真实概览/结算接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；测试/可靠性仅记录一项非阻塞后续项：`SupplierSettlementsPage.test.tsx` 当前通过 `getAllByRole(...)[0]` 点击重复的 `返回推荐工作台` 按钮，后续可继续收敛为 fallback 卡片 scoped selector，但当前不阻塞该 focused 切片提交。继续保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` / async-validator 噪声与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为更多供应商/管理员 shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback 基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"收敛管理员风控页 shared-console 规则编辑语义：已为 `AdminRiskPage` 风控规则表内的启用开关补充按 rule key 派生的稳定 `aria-label`，并为阈值 / 窗口分钟输入补充对应 `field` 标识，保持单一登录后深色共享控制台、角色菜单 gating 与 mission-control 叙事不变，只修复规则编辑控件语义与 focused 测试/可访问性契约。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/utils/consoleNavigation.test.ts src/pages/AdminRiskPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx src/pages/ApiDocsPage.test.tsx src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，以及前端 `/admin/risk`、`/docs` 壳 200，确认该语义修复没有破坏共享路由契约、普通用户注册后菜单链路与管理员真实风控/审计入口。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维均通过；代码质量评审仅记录一项非阻塞后续项：`AdminRiskPage` 规则表渲染仍通过 `rules[index]` 访问行数据，若后续引入排序/虚拟化可再收敛为 `record` 驱动，但当前 diff 未放大该风险且 focused 测试、构建与真实 API 已复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、风控页表格非 Form 上下文控件警告与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项继续回到更多管理员/供应商 shared-console 页面 CTA 抑制 / fallback 基线与表单/测试噪声清理，再推进 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”收口 `SupplierOfferingsPage` focused 回归脆弱点：将“无权限时不展示 API Keys / Webhook / Docs CTA”的断言从依赖 `.semi-card` 包装层的局部查询，升级为全页级负断言，并显式锚定 `supplier-offerings-shared-console-fallback` 回退按钮后再执行“返回推荐工作台”真实导航；继续保持 new-api 风格单一登录后深色控制台、共享接入桥接与角色菜单 gating 合同不变，只修复 shared-console fallback 测试对 Semi UI DOM 结构的脆弱依赖。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 与前端 `/docs` 壳 200，确认本轮 focused 测试去脆弱化没有破坏注册后普通用户共享菜单、真实接入接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为本轮 diff 去除了对 `.semi-card` 包装层的脆弱依赖，并强化了“无权限 CTA 全页不应出现 + fallback 可回推荐工作台”的 shared-console 合同。仅保留一项非阻塞后续项：如后续继续清理该页测试，可把 `within(fallback.parentElement as HTMLElement)` 再收敛为更稳定的按钮/区域锚点，但当前不阻塞该 focused 回归里程碑提交。

- 本轮继续按"前端优先"清理 `SettingsPage` focused 回归中的 `.closest('.semi-card')` 结构耦合：已为“集成任务流”与普通用户“首次使用清单”补充稳定 `data-testid` 语义锚点，并将 `web/src/pages/SettingsPage.test.tsx` 改为通过 `within(...)` + 语义锚点验证注册后首轮清单、重新打开首轮引导与深色 Console Mission Control 区域，而不是继续依赖 Semi UI 卡片 DOM 包装层；保持 new-api / Linear 风格单一登录后深色共享控制台、角色差异菜单与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SettingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/settings` 壳 200，确认新的 Settings 语义锚点没有破坏注册后普通用户共享菜单、真实接入接口与单壳前端入口。
- 本轮继续按“前端优先”清理 `ApiKeysPage` focused 回归中的多匹配脆弱点：已把撤销 / 编辑白名单相关断言从 `getAllByRole(...)[0]` 的顺序耦合切换为以 API Key 名称定位表格行，再用 `within(row)` 执行行内按钮查询，继续保持 new-api 风格单一登录后深色共享控制台、共享接入回退路径与真实 API Key / Webhook / Docs 菜单 gating 合同不变，而不是继续依赖按钮数组顺序。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiKeysPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/docs`、`/webhooks` 壳 200，确认新的 ApiKeys 行级语义查询没有破坏注册后共享菜单、真实接入接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅把 `ApiKeysPage.test.tsx` 的重复按钮定位收敛为表格行级语义查询，未引入新的运行时/权限/部署风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍依赖重复 `getAllByRole(...)` / 顺序索引的页面，再回到 Phase 4/5 其余后端能力。

- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅将 SettingsPage focused 测试从脆弱结构选择器收敛为稳定语义锚点，未改变运行时权限、菜单 gating 或页面叙事。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理 `ProjectsPage` / `OrdersPage` / 其余 shared-console focused 用例中的 `.closest('.semi-card')` 与 `parentElement` 结构耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理管理员 shared-console focused 回归中的残余全局 fallback CTA 查询耦合：已将 `AdminRiskPage.test.tsx`、`AdminAuditPage.test.tsx`、`AdminUsersPage.shared-console.test.tsx` 中对 `返回推荐工作台` 的点击与说明文案断言，从宽泛页面级查询收敛为各自 fallback 卡片 `data-testid` 作用域内的 `within(...)` 查询，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实回退导航合同不变，而不是继续依赖全页同名按钮匹配。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminRiskPage.test.tsx src/pages/AdminAuditPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-095328`），确认 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/api-keys`、`/webhooks`、`/docs`、`/admin/risk`、`/admin/audit` 壳 200 均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅把管理员 fallback CTA 查询收敛到既有 fallback 卡片作用域，降低全局同名按钮误匹配风险而未削弱跨区域 CTA 抑制或真实导航合同。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例中残留的全局 fallback 文案/按钮查询耦合，然后再回到 Phase 4/5 其余后端能力。


- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余重复 CTA / 全局查询耦合：已将 `App.test.tsx` 中 supplier/profile/dashboard/settings 场景的 `前往域名管理`、`查看审计日志` 导航断言从脆弱的全局重复按钮索引收敛为唯一查询或显式重复集合断言，并将 `web/src/pages/OrdersPage.test.tsx` 空态 `查看 API 接入准备` / `前往项目市场` 断言收敛到 `.semi-empty` 作用域内，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx src/pages/OrdersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/settings`、`/projects`、`/orders`、`/api-keys`、`/webhooks`、`/docs`、`/admin/suppliers` 壳 200，确认新的 scoped 查询没有破坏注册后共享菜单、管理员真实运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅去除了 `App.test.tsx` / `OrdersPage.test.tsx` 中残余的全局重复按钮顺序依赖并把订单空态 CTA 锁定到真实 Empty 区域，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里仍残留的 `.closest('.semi-card')` / `.semi-empty` / 顺序索引耦合，并优先补充更稳定的语义锚点，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余重复按钮 / 结构选择器耦合：已把 `App.test.tsx` 注册后 onboarding 的 API Keys 入口、`AdminSuppliersPage.test.tsx` 管理员主任务流、`AdminUsersPage.shared-console.test.tsx` 供应商结算确认、`SupplierSettlementsPage.test.tsx` mission fallback、`WebhooksPage.test.tsx` 首轮联调卡片，以及 `ProjectsPage.test.tsx` / `OrdersPage.test.tsx` 空态 CTA，统一收敛为卡片级 scoped 查询、既有 `data-testid` 语义锚点或显式重复按钮集合断言；同时仅在 `AdminSuppliersPage` 生产代码补入最小化 `data-testid="admin-suppliers-mission-flow"`，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx src/pages/AdminSuppliersPage.test.tsx src/pages/SupplierSettlementsPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/settings`、`/projects`、`/orders`、`/api-keys`、`/webhooks`、`/admin/suppliers` 壳 200，确认新的 scoped 语义查询没有破坏注册后共享菜单、管理员真实运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅去除了残余 `.closest('.semi-card')` / 全局同名按钮顺序依赖，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理 `App.test.tsx` 其余重复 CTA 与更多 shared-console focused 用例中的顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余结构/重复 CTA 耦合：已为 `WebhooksPage` 普通用户首轮联调卡片补充稳定 `data-testid="webhooks-first-integration-loop"`，并将 `App.test.tsx` 注册后 onboarding 入口、`WebhooksPage.test.tsx` 文档导航与 `ProjectsPage.test.tsx` 空态动作从 `.closest('[class*=semi-card]')` / 全局重复按钮查询收敛为 `dashboard-next-steps-lane`、`webhooks-first-integration-loop`、`projects-empty-state-actions` 语义锚点 + `within(...)` scoped 查询；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航合同不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx src/pages/WebhooksPage.test.tsx src/pages/ProjectsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/`、`/projects`、`/api-keys`、`/webhooks`、`/docs` 壳 200，确认新的 scoped 语义锚点没有破坏注册后共享菜单、真实接入接口、管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；代码质量首轮仅指出 `ProjectsPage.test.tsx` 需要等待空态异步渲染后再读取 `projects-empty-state-actions`，已补入 `findByText` / `findByTestId` 复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理 `App.test.tsx` / 其余 shared-console focused 用例中仍残留的重复 CTA 与顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"清理 `AdminSuppliersPage` focused 回归里的重复 CTA 顺序耦合：已将管理员供应商运营页从 `getAllByRole(...)[0]` 选择第一个"前往处理结算 / 争议"、"查看风控中心"、"查看审计日志" 的脆弱断言，收敛为以可见标题 `管理员主任务流` 锁定对应 mission-control 卡片，再通过 `within(...)` 点击该区域内的真实 CTA；同时把导航断言改成 `it.each(...)` 参数化切片，继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与管理员供应商运营合同不变，而不是继续依赖重复按钮顺序。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminSuppliersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/admin/suppliers`、`/api-keys`、`/webhooks`、`/docs` 壳 200，确认新的 mission-flow 作用域没有破坏注册后共享菜单、管理员真实运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中首轮评审对新增 test-only 语义锚点持保留意见后，已改为基于可见标题 `管理员主任务流` 的卡片级作用域查询并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的重复 `getAllByRole(...)` / 顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按"前端优先"推进 shared-console 导航可靠性切片：已将 `visibleQuickActionPaths` 收敛为服务端 `menu` 真值 + 当前路径过滤，避免 Header quick actions 暴露未授权入口或重复当前页；同时为 `ConsoleLayout` 主内容区补上语义化 `main` landmark，为后续 shared-console 页面继续细化前端交互时提供更稳定的导航/可访问性合同。
- 已补齐 `web/src/components/ConsoleLayout.test.tsx`、`web/src/components/AppSidebar.test.tsx` 与 `web/src/utils/consoleNavigation.test.ts` focused 回归，覆盖：当前页不出现在 quick actions、quick actions 按共享路由优先级排序、Sidebar 当前路径选中态、Sidebar 菜单真实点击跳转，以及 `menu` 不暴露 quick-action 路由时 Header 不再泄露对应按钮。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/components/ConsoleLayout.test.tsx src/components/AppSidebar.test.tsx src/utils/consoleNavigation.test.ts`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints` 与前端 `/`、`/projects`、`/orders`、`/api-keys`、`/docs` 壳 200，确认新的 shared-console 导航可靠性切片没有破坏注册后普通用户菜单真值、真实接入接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审仅记录两个非阻塞后续项：其一，`AppSidebar.test.tsx` 当前仍通过 `.semi-navigation-item-selected` 断言选中态，后续可继续收敛为更稳定的可访问性语义；其二，既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警仍为后续债务，但本轮 diff 未新增对应运行时回归。下一前端优先项可继续把同类导航/回退语义锚点推广到更多 shared-console 页面后，再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 `ApiDocsPage` focused 回归中的残余重复 CTA 顺序耦合：已将首页 Docs Mission Control 用例里进入 API Keys 的断言从全局 `getAllByText(...)[0]` 收敛为 `docs-shared-console-loop` 语义锚点内的 role 查询，继续保持 new-api 风格单一登录后深色共享控制台、Docs → API Keys → Webhooks 单壳闭环与真实导航合同不变，而不是继续依赖重复按钮文本顺序。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiDocsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5` 与前端 `/docs`、`/api-keys` 壳 200，确认新的 scoped 语义查询没有破坏注册后共享菜单、真实接入接口、管理员运营接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅把 `ApiDocsPage.test.tsx` 的 API Keys 导航断言从全局重复文案顺序依赖收敛为 `docs-shared-console-loop` 作用域内的可访问性查询，未引入新的运行时、权限、CI 或部署风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的重复 `getAllByText(...)` / 顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。

- 本轮继续按“前端优先”补齐 `SupplierResourcesPage` shared-console 菜单真值契约：供应商资源页现已新增与相邻 supplier 页面一致的“共享控制台联动”区块，把 `API Keys / Webhook 设置 / API 文档` 接入入口继续留在同一套 new-api 风格单一登录后深色控制台中；仅当服务端 `menu` 实际暴露 `/api-keys`、`/webhooks`、`/docs` 时显示对应 CTA，当三者全部缺失时仅展示 `返回推荐工作台` 回退动作，同时将 supplier mission fallback 与 shared-console fallback 分离，避免在资源页泄露未授权接入入口或混淆两类回退语义。
- 已补齐 `web/src/pages/SupplierResourcesPage.test.tsx` focused 回归，覆盖：共享控制台联动区块渲染、从资源页真实进入 `/api-keys`、`/webhooks`、`/docs` 的导航断言、下游 supplier 任务流与 shared-console CTA 同时缺失时的双 fallback 合同、以及当至少保留一个 bridge 入口时抑制 shared-console fallback；并按五维评审整改，将账号端口空值提交恢复为 `undefined` 语义，避免把未填写端口错误编码为 `0`。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierResourcesPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/supplier/resources/overview`（预期 403），以及前端 `/supplier/resources`、`/api-keys`、`/webhooks`、`/docs` 壳 200，确认新的资源页 shared-console bridge/fallback 没有破坏注册后普通用户共享菜单、真实资源权限边界与单壳前端入口。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；代码质量评审首轮指出账号端口空值被误传为 `0` 与 bridge 导航断言过度绑定图标 accessible name，现已恢复端口空值语义并将 CTA/fallback 测试收敛为更稳定的文案匹配后复验通过；测试/可靠性评审首轮指出缺少“至少保留一个 bridge 入口时不应出现 shared-console fallback”分支，现已补齐 focused 用例并复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为其余 supplier/admin/shared-console 页面补齐同级 bridge/fallback 基线与测试去脆弱化，再回到 Phase 4/5 其余后端能力。

### 最新执行检查点（2026-04-30）
- 本轮继续按“前端优先”清理 `WebhooksPage` focused 回归中的残余 UI 库结构耦合：已为“最近回调”指标卡补充最小化 `data-testid="webhooks-latest-delivery-metric"` 语义锚点，并将 `web/src/pages/WebhooksPage.test.tsx` 从依赖 `.closest('.semi-space')` 的 Semi UI 布局查询收敛为 `getByTestId(...)` + `within(...)` scoped 断言；继续保持 new-api 风格单一登录后深色共享控制台、注册后 API Keys → Webhooks → Docs 接入路径与真实回调页面合同不变，而不是继续依赖 UI 库 DOM 结构。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/WebhooksPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并执行真实 API 回放脚本 `.hermes/local-output/run_frontend_priority_real_api.sh`（产物目录 `real-api-frontend-priority-20260503-080410`），确认普通用户 `/auth/menu` `/auth/me` `/dashboard/overview` `/auth/api-keys` `/webhooks/endpoints`、管理员 `/auth/menu` `/admin/overview` `/admin/risk` `/admin/audit?limit=5` 与前端 `/webhooks` `/api-keys` `/docs` 单壳入口均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅为 `WebhooksPage` 的“最近回调”指标卡增加稳定语义锚点并替换脆弱 `.semi-space` 查询，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理 `SupplierDomainsPage` / `AdminAuditPage` / `App.test.tsx` 等 focused 用例里残留的 `closest('table')` / 结构选择器耦合，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"清理 shared-console focused 回归中的残余 `closest('table')` 结构耦合：已为 `AdminAuditPage` 的"审计事件"卡片与 `SupplierDomainsPage` 的"域名池列表"卡片补充最小化 `data-testid` 语义锚点，并将 `AdminAuditPage.test.tsx`、`App.test.tsx`、`SupplierDomainsPage.test.tsx` 统一改为 `getByTestId(...)` + `within(...)` 锁定真实业务卡片，不再依赖表格 DOM 向上爬取；继续保持 new-api 风格单一登录后深色共享控制台、角色菜单 gating 与真实导航/真实 API 合同不变，而不是为了测试稳定性改动运行时权限或拆分后台。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminAuditPage.test.tsx src/pages/SupplierDomainsPage.test.tsx src/pages/WebhooksPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`，并执行真实 API / SPA 壳回放（产物目录 `real-api-frontend-priority-20260503-082434`），确认普通用户注册后 `/projects` `/orders` `/balance` `/profile` `/api-keys` `/webhooks` `/settings` `/docs` 菜单与接口、管理员 `/admin/overview` `/admin/risk` `/admin/audit` 真实接口，以及 `/admin/audit` `/supplier/domains` 等前端单壳路由 200 校验均未被本轮 focused 去脆弱化破坏。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；评审一致认为当前 diff 仅为审计/供应商域名页增加最小化语义锚点并替换脆弱 `closest('table')` 查询，未引入新的运行时、权限、部署或性能风险。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续清理其余 shared-console focused 用例里残留的 `closest('table')` / 顺序索引耦合，然后再回到 Phase 4/5 其余后端能力。

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
- 本轮五维评审结论：产品/规格初审曾指出共享接入桥接中的 API Keys 路径常量漂移，现已修复 `API_KEYS_ROUTE='***'` 并复验通过；代码质量、安全/集成、测试/可靠性、性能/运维评审通过，保留 `ConsoleLayout.test.tsx` 旧断言与 Semi UI `findDOMNode` / React Router future warnings / 前端大 chunk 告警为后续非阻塞债务。
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