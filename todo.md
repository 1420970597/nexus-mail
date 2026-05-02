# Nexus-Mail 完整开发计划（todo.md）

> **执行模式已切换：** 本文档不再只是规划稿，而是当前仓库的**执行中路线图**。后续提交必须对照阶段目标更新状态，并在阶段完成后进入下一阶段。

## 执行状态看板（持续维护）

### 当前总体进度
- Phase 0：**已完成**（开发底座、Docker、多服务骨架已提交）
- Phase 1：**已完成**（身份权限、共享控制台骨架已提交）
- Phase 2：**已完成**（项目/库存/激活订单主链路、管理员项目配置、供应商资源录入已提交）
- Phase 3：**已完成**（已完成 SMTP 会话落盘、metadata 入库、RabbitMQ 解析任务入队、MinIO 原始对象上传，并打通验证码/link 提取回退增强、订单 READY/FINISHED 自动迁移、真实 OAuth2 刷新接入、授权码/App Password/密码型凭证录入与健康状态落库、`env://` secret_ref 解析、IMAP/POP3 实际登录校验、官方邮箱端点限制、Proton Bridge 接入策略与 Postfix 转发样例）
- Phase 4：进行中（已完成用户钱包、冻结余额、成功扣费、超时退款、供应商待结算余额、管理员调账能力与基础结算页面；已完成供应商报表筛选、供货规则维护、管理员争议单显式筛选、供应商域名运营页、管理员供应商运营页与共享控制台深色单壳导航收敛；已完成 Webhooks / 风控 / 审计真实页面收敛与对应真实 API 回放验证；本轮继续优先补全注册后前端工作台首轮引导：保持单一登录后控制台与 new-api 风格深色壳不变，在 `DashboardPage` 为普通用户增加注册后共享控制台首轮任务卡（采购 / API 接入 / 角色扩展说明），并在 `SettingsPage` 增加“首次使用清单”与“重新打开首轮引导”回入口；补齐 `App.test.tsx` 覆盖注册成功后首轮任务卡展示、引导关闭后从设置页重新打开、普通用户首轮引导不泄露供应商/管理员任务文案；控制器依据五维评审整改，移除 `DashboardPage` 未使用回入口辅助函数、统一 Dashboard/Settings 首轮引导路由常量，并将角色扩展文案改为“后续被服务端授予角色”以避免把本地引导误写成服务端事实；已通过 `pnpm --dir web test -- src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、Docker Compose 重建后的真实 API `/healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/me` 验证普通用户共享菜单与页面入口仍可用；当前前端后续重点转为继续收敛定向 Vitest 选择范围与更多共享控制台页面细化；本轮已将 SettingsPage 升级为贴近 new-api / Linear 深色共享控制台的 Console Mission Control：新增深色任务总览、集成任务流（API Keys / Webhook / Docs）与控制台能力矩阵，保留普通用户首次使用清单与角色差异快捷入口；补齐 `SettingsPage.test.tsx` 对深色控制台入口、规范化共享路由导航与供应商场景抑制首轮清单的 focused 回归；已通过 `pnpm --dir web build`、`go test ./...`、Docker Compose 重建后真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview` 与前端 `/settings` 页面访问验证注册后共享控制台接入链路仍成立；下一前端优先项转为继续清理共享控制台 focused Vitest 噪声与补强更多页面的深色壳一致性；本轮已修复共享控制台 API Keys 路由真值漂移，恢复 `API_KEYS_ROUTE` 与 `/api-keys` 一致，并将 Dashboard / Settings / Profile / Orders 内相关 CTA 与菜单判断统一收口到共享路由常量；补齐 `App.test.tsx`、`ProfilePage.test.tsx`、`OrdersPage.test.tsx` 对注册后 onboarding、资料页与订单空态进入 API Keys 页的真实导航断言；已重新通过 `pnpm --dir web test -- src/App.test.tsx src/pages/ProfilePage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ProjectsPage.test.tsx src/components/ConsoleLayout.test.tsx`、`pnpm --dir web build`，并在 Docker Compose 重建后通过真实 API `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 验证注册后普通用户共享菜单仍包含 `/api-keys` 等基础接入入口；当前前端后续重点继续转向共享工作台 CTA 叙事统一，而不是回退为分裂式独立后台）
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

### 最新执行检查点（2026-05-02）
- 本轮继续按“前端优先”补齐 `SupplierDomainsPage` shared-console 权限抑制基线：页面现已接入 `useAuthStore.menu` 真值，只在服务端实际暴露 `/supplier/resources`、`/supplier/offerings`、`/supplier/settlements`、`/api-keys`、`/webhooks`、`/docs` 时展示对应 supplier 任务流与共享接入桥接 CTA；当这些下游入口缺失时，仅保留“返回推荐工作台”回退动作，并保留“当前域名运营阶段”卡片而不再渲染自循环 CTA，继续保持 new-api 风格单一登录后深色控制台，而不是泄露未授权入口或制造冗余后台。
- 已补齐 `web/src/pages/SupplierDomainsPage.test.tsx` focused 回归，覆盖：supplier 域名页在资源/供货/结算/API Keys/Webhook/Docs 菜单缺失时抑制对应 CTA、分别验证 mission fallback 与 shared-console fallback 回到推荐工作台、当前页已是唯一可见 supplier 工作台时隐藏 fallback、以及 `/supplier/resources/overview` 加载失败时展示显式错误态而非误报空数据。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierDomainsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/supplier/resources/overview`，以及前端 `/docs`、`/supplier/domains` 壳 200，确认新的供应商域名页权限抑制与错误态没有破坏注册后普通用户共享菜单、管理员真实资源概览接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、安全/集成通过；代码质量首轮指出误删“当前域名运营阶段”步骤卡片后，已改为保留该 mission step 并以只读 Tag 替代自循环 CTA 后复验通过；测试/可靠性首轮指出 mission fallback 分支未验证后，已补齐 focused 导航断言并复验通过；性能/运维首轮指出加载失败会误落空态后，现已改为显式错误 Banner 与暂停区域统计，复验通过。继续保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` / async-validator 噪声与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为更多 supplier/admin shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback / 错误态基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”补齐 `WebhooksPage` shared-console 菜单真值契约：新增 focused 回归覆盖当服务端 `menu` 仅暴露 `/` 与 `/webhooks` 时，Webhook 页空态中的 `API Keys` / `API 文档` CTA 会被正确抑制，并仅保留 `返回推荐工作台` 回退动作；点击后真实回到共享控制台首页，继续保持单一登录后深色壳与角色菜单扩展模型不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/WebhooksPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/webhooks/endpoints`，确认新增 fallback 契约断言没有破坏注册后普通用户共享菜单、Webhook 真实接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；其中外部子评审因误落到错误仓库已按 fail-closed 丢弃，最终以控制器侧 live diff、focused 测试、构建与真实 API 结果为准。保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续把 `Docs → API Keys → Webhooks` / `Webhooks → 推荐工作台` 这类共享接入 fallback 契约扩展到更多共享/供应商页面，再回到 Phase 4/5 余下后端能力。
- 本轮继续按“前端优先”补齐管理员 shared-console CTA 权限抑制基线：已为 `AdminUsersPage` 与 `AdminProjectsPage` 收口风险 / 审计 / API Keys / Webhook / Docs 入口的 `menu` 真值过滤，并在相关入口全部缺失且推荐工作台不再指向当前页时，仅保留“返回推荐工作台”回退动作，继续保持单一登录后深色控制台而不是泄露未授权管理入口。
- 已补齐 `web/src/pages/AdminUsersPage.shared-console.test.tsx` 与 `web/src/pages/AdminProjectsPage.test.tsx` focused 回归，覆盖：管理员资金工作台在仅剩当前页时抑制共享接入 CTA 并回退到 dashboard、价格策略页在风险/审计/接入入口缺失时仅保留 fallback 按钮、以及对应真实导航断言；同时为价格策略页新增稳定 `data-testid="admin-pricing-fallback-button"`。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminProjectsPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`、`GET /api/v1/admin/projects`，以及前端 `/admin/pricing`、`/admin/users` 壳 200，确认新的管理员页面权限抑制没有破坏注册后普通用户菜单、管理员真实概览接口与共享控制台前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅记录非阻塞后续项：`AdminUsersPage` 头部固定提示 Tag 未来可继续按 `menu` 真值收紧文案，既有 Semi UI `findDOMNode` / RTL `act(...)` 与前端 chunk 体积告警继续保留为后续债务。
- 本轮继续按"前端优先"补齐管理员 shared-console 权限抑制基线：`AdminRiskPage` 与 `AdminAuditPage` 已接入 `useAuthStore` + `menu` 真值，管理员主任务流 CTA 与共享接入桥接仅在服务端实际暴露 `/admin/audit`、`/admin/risk`、`/admin/users`、`/api-keys`、`/docs` 时才渲染；当这些入口全部缺失且推荐工作台不再指向当前页时，仅展示单一 `返回推荐工作台` 回退动作，继续保持单一登录后深色控制台，不泄露未授权管理入口。
- 已补齐 `web/src/pages/AdminRiskPage.test.tsx` 与 `web/src/pages/AdminAuditPage.test.tsx` focused 回归，覆盖：风控 / 审计页在权限缺失时抑制任务流与 bridge CTA、出现推荐工作台 fallback、以及当当前页已是唯一可见管理员路由时隐藏 fallback；同时新增对应 fallback 标记，避免测试回归依赖脆弱文案匹配。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminRiskPage.test.tsx src/pages/AdminAuditPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，确认本轮前端权限抑制切片未引入新的前后端回归；当前仍保留既有 Semi UI `findDOMNode` / `Form` 警告与前端 chunk 体积告警为非阻塞债务。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；下一前端优先项转为继续为其余管理员 shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback 基线，并在此后再回到 Phase 4/5 余下真实 API 能力推进。
- 本轮继续按"前端优先"补齐管理员 shared-console 权限抑制基线：已为 `AdminSuppliersPage` 收口共享接入桥接与运营 CTA 的 `menu` 真值，只有当 `/admin/users`、`/admin/risk`、`/admin/audit`、`/api-keys`、`/webhooks`、`/docs` 真正暴露时才显示对应动作；当这些入口全部不可用且推荐路由不再指向当前页时，仅保留"返回推荐工作台"回退按钮，继续保持单一登录后深色控制台而不是泄露未授权后台入口。
- 已补齐 `web/src/pages/AdminSuppliersPage.test.tsx` focused 回归，覆盖：管理员供应商运营页在目标权限缺失时抑制结算 / 风控 / 审计与共享接入桥接 CTA、仅保留回退到推荐工作台的真实导航，以及 bridge 目标部分存在时只显示当前有权访问的 API Keys / Docs 标签；同时按五维评审整改，新增 `data-testid="admin-suppliers-shared-console-bridge"` 作为稳定语义锚点。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/AdminSuppliersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`，以及前端 `GET http://127.0.0.1:5173/docs` 与 `GET http://127.0.0.1:5173/admin/suppliers` 壳 200，确认新的管理员供应商页权限抑制没有破坏注册后普通用户菜单、管理员真实概览接口与共享控制台前端入口。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维通过；代码质量评审仅指出移除未使用导入与后续可继续把重复 CTA 查询收敛为更稳定 scoped selector，现已清理未使用导入并复验通过。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为 `AdminRiskPage` / `AdminAuditPage` 补齐同级 menu 真值 CTA 抑制与 fallback 基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”补齐 `AdminRiskPage` / `AdminAuditPage` shared-console 权限抑制基线：两页现已接入 `useAuthStore.menu` 真值，对管理员主任务流 CTA 与 bridge 标签按 `/admin/risk`、`/admin/audit`、`/admin/users`、`/api-keys`、`/docs` 实际暴露情况动态收口；当风控/审计页相关 bridge 入口全部缺失且推荐工作台不再指向当前页时，仅展示单一 `返回推荐工作台` 回退动作，继续保持单一登录后深色控制台而不是泄露未授权管理入口。
- 已补齐 `web/src/pages/AdminRiskPage.test.tsx` 与 `web/src/pages/AdminAuditPage.test.tsx` focused 回归，覆盖：风控 / 审计页在权限缺失时抑制任务流与 bridge CTA、出现推荐工作台 fallback、以及当当前页已是唯一可见管理员路由时隐藏 fallback；同时补跑 `src/utils/consoleNavigation.test.ts` 以确认共享导航常量与推荐工作台解析仍一致。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/utils/consoleNavigation.test.ts src/pages/AdminRiskPage.test.tsx src/pages/AdminAuditPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，以及前端 `/admin/risk`、`/admin/audit` 壳 200，确认新的权限抑制与 fallback 逻辑没有破坏真实菜单契约与管理页入口可达性。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维通过；代码质量评审仅指出 `AdminRiskPage` / `AdminAuditPage` 的可见 CTA 过滤与 fallback 卡片结构仍有重复，可在后续继续抽取共享 helper/组件，但当前不阻塞本次前端切片提交。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为更多管理员 shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback 基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按“前端优先”推进 Docs Mission Control 与共享控制台桥接路径：已在 `ApiDocsPage` 新增“文档 → 真实业务 → 接入回放”深色桥接区，按服务端 `menu` 真值把项目市场、余额中心、API Keys 与 Webhook 工作台重新串回单一登录后控制台，并在所有桥接入口缺失时仅回退到推荐工作台，避免把 `/docs` 留成孤立说明页或泄露未授权入口。
- 已补齐 `web/src/pages/ApiDocsPage.test.tsx` focused 回归，覆盖 Docs 桥接区到项目市场 / API Keys / Webhook / 余额中心的真实导航，以及 bridge 目标缺失时仅显示“返回推荐工作台”的回退断言；同时按五维评审整改，新增 `data-testid="docs-shared-console-bridge"` 作为稳定语义锚点，移除对 `.semi-card` 结构的脆弱依赖。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiDocsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/wallet/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory` 与前端 `/docs` 壳 200，确认新的 Docs 桥接叙事没有破坏注册后普通用户共享菜单、真实接口契约与文档入口可达性。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、性能/运维通过；测试/可靠性首轮指出桥接测试依赖 `.semi-card` 选择器过脆后，已改为稳定 `data-testid` 语义锚点并复验通过。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续补齐更多 shared-console 页面在“无权限时 CTA 抑制”与“文档/业务工作台双向桥接”方向的 focused 基线，然后再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"收敛 shared-console 接入叙事：已将 `DashboardPage` 普通用户主任务中的集成卡片文案与 `ApiKeysPage` / `WebhooksPage` / `ApiDocsPage` 的 API Keys → Webhook → Docs 单壳路径统一到同一套措辞，并补齐 focused 导航回归，确保首页推荐下一步、API 密钥空态、Webhook 首轮联调建议与 Docs Mission Control 都继续指向同一登录后控制台，而不是分裂成额外后台。
- 已补齐 `web/src/pages/DashboardPage.test.tsx`、`web/src/pages/ApiKeysPage.test.tsx`、`web/src/pages/WebhooksPage.test.tsx`、`web/src/pages/ApiDocsPage.test.tsx` focused 回归，覆盖：首页推荐下一步进入 API Keys、API Keys 空态进入 Docs、Webhook 首轮联调卡片保持 API Keys / Docs 双向衔接，以及 Docs Mission Control 回到 Webhook 设置的真实导航；同时按五维评审整改，移除无效的路由常量伪断言、收紧 Docs/Webhooks 选择器作用域，并恢复白名单失败路径对 `updateAPIKeyWhitelist` 调用参数的精确断言。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/DashboardPage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/ApiDocsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints` 与网关 `GET /docs` 壳 200 验证，确认新的 shared-console 接入叙事没有破坏注册后普通用户菜单、共享页面入口与真实接口契约。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维通过；代码质量首轮指出无效常量测试、Docs/Webhooks 测试过度依赖索引与弱断言后，已完成 focused 整改并复验通过。保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续补齐更多 shared-console 页面在"无权限时 CTA 抑制"与"回退到推荐工作台"方向的 focused 基线，再回到 Phase 4/5 其余后端能力。
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
- 本轮继续按前端优先补齐 `ApiKeysPage` shared-console 回退分支：新增“共享接入回退路径”深色卡片，把 API Keys → Webhook → Docs 的 bridge copy 收口到同一登录后控制台；当 `menu` 暴露 `/projects`、`/webhooks`、`/docs` 时分别展示项目市场 / Webhook / 文档 CTA，当这些入口未暴露时仅保留“返回推荐工作台”回退按钮，避免把未授权集成入口误展示成可用功能。
- 已补齐 `web/src/pages/ApiKeysPage.test.tsx` focused 回归，覆盖：共享接入回退卡片文案渲染，以及当 `menu` 未暴露 webhook/docs（且不再暴露 projects）时抑制集成 CTA、仅回退到推荐工作台的导航断言；同时按五维评审整改，把“返回推荐工作台”显示条件收紧为 `projects/webhooks/docs` 全部不可用时才出现，避免与“返回项目市场”形成矛盾 CTA。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiKeysPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations` 与主站 `GET /docs` 200，确认新的 API Keys 回退分支没有破坏注册后共享控制台菜单真值与真实接口契约。
- 本轮五维评审结论：安全/集成、测试/可靠性、性能/运维通过；产品/规格首轮指出“webhook/docs 不可用时却仍隐藏项目市场 CTA”的合同歧义后，已将实现收敛为仅在 projects/webhooks/docs 全部不可用时显示“返回推荐工作台”并复验通过；代码质量评审仅保留 focused 文案断言仍可继续去脆弱化为后续非阻塞债务。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，以及真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`、前端 `/settings` 返回 200，确认本轮仅修复 focused 测试契约漂移，运行时共享控制台链路与真实接口仍可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；当前 diff 仅修正测试断言，不引入新的运行时代码。保留前端 chunk 体积告警、Semi UI `findDOMNode` 与既有 React Testing Library `act(...)` 噪声为后续非阻塞债务，并按 todo 保持下一步继续以前端优先推进。
- 本轮新增一个前端 focused 纵向切片补强：`web/src/pages/WebhooksPage.test.tsx` 已补上共享控制台首轮接入导航断言，通过真实页面按钮验证普通用户可从 Webhook 工作台继续进入 API Keys 与 API 文档，而不是只停留在接入文案展示；测试同时改为复用共享路由常量，避免 `/api-keys` / `/docs` 路径再次与控制台注册路由漂移。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/WebhooksPage.test.tsx`、`pnpm --dir web exec vitest run src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /docs`、前端 `/settings`、`/webhooks` 200，确认注册后普通用户共享菜单仍返回 `/api-keys` / `/webhooks` / `/docs`，新增导航断言对应的真实接口与页面壳链路保持可用。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅记录两个非阻塞后续项：其一，后续可继续为 `返回推荐工作台` CTA 增加 focused 导航断言；其二，保留既有全局 Vitest `act(...)`、Semi UI `findDOMNode` 与前端 chunk 体积告警为下一前端优先债务，不阻塞本次测试基线加固提交。
- 本轮继续以前端优先补齐 `ProfilePage` shared-console 回退链路：在账号中枢新增角色感知的 return card，supplier/admin 若服务端 `menu` 暴露 `/settings` 则优先回到设置中心继续同一深色控制台任务流；若 `settings` 未暴露则退回推荐工作台；普通用户在项目市场入口被服务端收起时也能从 Profile 页回到推荐工作台，而不会在个人资料页暴露错误入口或卡死。
- 已补齐 `web/src/pages/ProfilePage.test.tsx` focused 回归，覆盖 supplier/admin 在 settings 可用时点击“返回共享工作台”真实进入 `/settings`、supplier/admin 在 settings 不可用时回到推荐工作台、普通用户缺少 `/projects` 时显示“返回推荐工作台”、以及当 `menu` 仅剩 `/profile` 时隐藏该 return card，继续保持单一登录后共享控制台与角色扩展菜单模型不变。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ProfilePage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/App.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`，以及前端 `/docs`、`/profile` 壳 200，确认新的 Profile 回退链路没有破坏注册后普通用户共享菜单、真实 API 契约与前端页面壳可达性。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；控制器先按评审补齐了 supplier/admin 在 settings 缺失时的 fallback CTA 导航断言与 `menu` 仅剩 `/profile` 时的隐藏断言，复验后通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续把更多 shared-console 页面中的 return/fallback CTA 语义锚点与路由常量收敛到同一套稳定契约。
- 本轮继续优先收敛 `DashboardPage` 与余额/采购链路的共享控制台 CTA 叙事：已为普通用户 Dashboard 新增“推荐下一步”工作台，按服务端 menu 真值把余额中心 → 项目市场 → 订单中心 → API Keys 收敛到单一登录后深色共享控制台的统一路径，而不是让首页只停留在泛化概览文案。
- 已新增 `web/src/pages/DashboardPage.test.tsx` focused 回归，覆盖：推荐下一步 lane 的预算/采购/履约/接入卡片渲染、从 Dashboard 进入 Balance / Projects / Orders / API Keys 的真实导航，以及当服务端 menu 未暴露余额/订单/API Keys 时对应 CTA 被抑制。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/DashboardPage.test.tsx src/App.test.tsx src/pages/BalancePage.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx`、`pnpm --dir web build`、`go test ./...`，并完成真实 API 回放 `GET /healthz`、`POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/wallet/overview`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints` 与前端 `/docs` 200，确认首页新路径没有破坏注册后共享控制台与真实 API 合同。
- 本轮五维评审结论：产品/规格、安全/集成、性能/运维通过；代码质量评审建议后续继续把 `DashboardPage` 内历史硬编码路径收敛到共享常量，测试/可靠性评审建议后续将新 lane 的 `.closest('.semi-card')` 选择器再升级为更稳定语义锚点，但二者当前均不阻塞该里程碑提交。下一前端优先项转为继续统一 Dashboard 与 ApiKeys/Webhooks/Docs 的共享接入叙事，随后再回到 Phase 4/5 余下能力。
- 本轮继续按“前端优先”补齐 Docs Mission Control 的共享控制台后续闭环：已在 `ApiDocsPage` 新增“Docs → API Keys → Webhooks”深色 follow-up lane，把阅读文档后的下一步重新收敛回单一登录后控制台；仅在服务端 `menu` 暴露 `/api-keys`、`/webhooks` 时显示对应 CTA，并在这些入口缺失时回退到推荐工作台，避免文档页成为孤立终点或泄露未授权路径。
- 已补齐 `web/src/pages/ApiDocsPage.test.tsx` focused 回归，覆盖：Docs follow-up lane 渲染、从文档页真实进入 API Keys / Webhook 工作台，以及仅保留 dashboard/docs 时通过稳定 `data-testid="docs-shared-console-loop"` 回退到推荐工作台的导航断言；同时按五维评审整改，移除生产代码中的 magic sentinel 文本为常量 `DOCS_LOOP_FALLBACK_PATH`，并避免测试继续依赖 `.semi-card` 结构。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/ApiDocsPage.test.tsx src/pages/ApiKeysPage.test.tsx src/pages/WebhooksPage.test.tsx src/pages/DashboardPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ProjectsPage.test.tsx src/pages/OrdersPage.test.tsx src/pages/ProfilePage.test.tsx src/pages/BalancePage.test.tsx src/components/ConsoleLayout.test.tsx src/utils/consoleNavigation.test.ts`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、`GET /api/v1/projects/inventory`、`GET /api/v1/orders/activations`、`GET /api/v1/wallet/overview` 与前端 `/docs`、`/api-keys`、`/webhooks` 壳 200，确认新增 docs follow-up lane 没有破坏注册后普通用户共享菜单、真实接口契约与单壳导航语义。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维通过；代码质量首轮指出 `ApiDocsPage` 新增 loop lane 使用 magic fallback 字符串和 `.semi-card` 测试作用域过脆后，现已改为常量 `DOCS_LOOP_FALLBACK_PATH` 与稳定 `data-testid` 语义锚点并复验通过。继续保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续统一更多 shared-console 页面在“读文档后下一步”与“无权限时 CTA 抑制/推荐工作台回退”方向的 focused 基线，再回到 Phase 4/5 其余能力。
- 本轮继续按"前端优先"补齐供应商 shared-console 权限抑制基线：`SupplierOfferingsPage` 现已接入 `menu` 真值，只在服务端实际暴露 `/api-keys`、`/webhooks`、`/docs` 时展示共享接入桥接 CTA；当这些入口全部缺失时仅保留 `返回推荐工作台` 回退动作，继续保持 new-api 风格单一登录后深色控制台，而不是在供应商供货页泄露未授权接入入口。
- 已补齐 `web/src/pages/SupplierOfferingsPage.test.tsx` focused 回归，覆盖：供应商供货页共享桥接 CTA 在 API Keys / Webhook / Docs 菜单缺失时被抑制、仅显示 fallback 返回推荐工作台、并保持既有资源页 / 结算页 / API Keys 导航链路不断裂；同时按评审整改，将 `fallbackRoute` 的 role 读取收敛为响应式 `useAuthStore` selector，避免依赖 `getState()`。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/supplier/resources/overview`，确认新的供应商供货页权限抑制没有破坏注册后普通用户共享菜单、管理员真实资源概览接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；仅保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` 与前端 chunk 体积告警为后续非阻塞债务。下一前端优先项转为继续为其余供应商 shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback 基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"补齐供应商 shared-console 权限抑制基线：`SupplierSettlementsPage` 现已接入 `useAuthStore.menu` 真值，只在服务端实际暴露 `/supplier/resources`、`/supplier/offerings`、`/api-keys`、`/webhooks`、`/docs` 时展示对应供应商任务流与共享接入桥接 CTA；当这些下游入口全部缺失时，仅保留 `返回推荐工作台` 回退动作，并在当前页已是唯一可见结算路由时隐藏 fallback，继续保持 new-api 风格单一登录后深色控制台，而不是让供应商结算页泄露未授权后续入口。
- 已补齐 `web/src/pages/SupplierSettlementsPage.test.tsx` focused 回归，覆盖：供应商结算页在资源 / 供货 / API Keys / Webhook / Docs 菜单缺失时抑制对应 CTA、仅显示 fallback 返回推荐工作台、以及当当前页已是唯一可见供应商路由时隐藏 fallback；同时按评审整改，将 mission flow / shared-console bridge 都补上稳定 `data-testid` 语义锚点，并用 scoped `within(...)` 导航断言替代全局脆弱匹配。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/pages/SupplierSettlementsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`、`GET /healthz`，并完成真实 API 回放：普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/supplier/settlements`（预期 403）、`GET /api/v1/auth/api-keys`（200）、`GET /api/v1/webhooks/endpoints`（200），以及管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/overview`、`GET /api/v1/supplier/settlements`（200）与前端 `/supplier/settlements` 壳 200，确认新的供应商结算页权限抑制没有破坏注册后普通用户共享菜单、管理员真实概览/结算接口与单壳前端入口。
- 本轮五维评审结论：产品/规格、代码质量、安全/集成、测试/可靠性、性能/运维均通过；测试/可靠性仅记录一项非阻塞后续项：`SupplierSettlementsPage.test.tsx` 当前通过 `getAllByRole(...)[0]` 点击重复的 `返回推荐工作台` 按钮，后续可继续收敛为 fallback 卡片 scoped selector，但当前不阻塞该 focused 切片提交。继续保留既有 Semi UI `findDOMNode`、Testing Library `act(...)` / async-validator 噪声与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项转为继续为更多供应商/管理员 shared-console 页面补齐同级 menu 真值 CTA 抑制 / fallback 基线，再回到 Phase 4/5 其余后端能力。
- 本轮继续按"前端优先"收敛管理员风控页 shared-console 规则编辑语义：已为 `AdminRiskPage` 风控规则表内的启用开关补充按 rule key 派生的稳定 `aria-label`，并为阈值 / 窗口分钟输入补充对应 `field` 标识，保持单一登录后深色共享控制台、角色菜单 gating 与 mission-control 叙事不变，只修复规则编辑控件语义与 focused 测试/可访问性契约。
- 控制器已重新通过 `pnpm --dir web exec vitest run src/utils/consoleNavigation.test.ts src/pages/AdminRiskPage.test.tsx src/pages/AdminUsersPage.shared-console.test.tsx src/pages/ApiDocsPage.test.tsx src/pages/SupplierOfferingsPage.test.tsx`、`pnpm --dir web build`、`go test ./...`、`docker compose up -d --build web api gateway`，并完成真实 API 回放 `GET /healthz`、普通用户 `POST /api/v1/auth/register`、`GET /api/v1/auth/menu`、`GET /api/v1/auth/me`、`GET /api/v1/dashboard/overview`、`GET /api/v1/auth/api-keys`、`GET /api/v1/webhooks/endpoints`、管理员 `POST /api/v1/auth/login`、`GET /api/v1/auth/menu`、`GET /api/v1/admin/risk`、`GET /api/v1/admin/audit?limit=5`，以及前端 `/admin/risk`、`/docs` 壳 200，确认该语义修复没有破坏共享路由契约、普通用户注册后菜单链路与管理员真实风控/审计入口。
- 本轮五维评审结论：产品/规格、安全/集成、测试/可靠性、性能/运维均通过；代码质量评审仅记录一项非阻塞后续项：`AdminRiskPage` 规则表渲染仍通过 `rules[index]` 访问行数据，若后续引入排序/虚拟化可再收敛为 `record` 驱动，但当前 diff 未放大该风险且 focused 测试、构建与真实 API 已复验通过。继续保留既有 Semi UI `findDOMNode`、RTL `act(...)`、风控页表格非 Form 上下文控件警告与前端 chunk 体积告警为后续非阻塞债务；下一前端优先项继续回到更多管理员/供应商 shared-console 页面 CTA 抑制 / fallback 基线与表单/测试噪声清理，再推进 Phase 4/5 其余后端能力。

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