# Nexus-Mail 完整开发计划（todo.md）

> **执行模式已切换：** 本文档不再只是规划稿，而是当前仓库的**执行中路线图**。后续提交必须对照阶段目标更新状态，并在阶段完成后进入下一阶段。

## 执行状态看板（持续维护）

### 当前总体进度
- Phase 0：**已完成**（开发底座、Docker、多服务骨架已提交）
- Phase 1：**已完成**（身份权限、共享控制台骨架已提交）
- Phase 2：**已完成**（项目/库存/激活订单主链路、管理员项目配置、供应商资源录入已提交）
- Phase 3：**已完成**（已完成 SMTP 会话落盘、metadata 入库、RabbitMQ 解析任务入队、MinIO 原始对象上传，并打通验证码/link 提取回退增强、订单 READY/FINISHED 自动迁移、真实 OAuth2 刷新接入、授权码/App Password/密码型凭证录入与健康状态落库、`env://` secret_ref 解析、IMAP/POP3 实际登录校验、官方邮箱端点限制、Proton Bridge 接入策略与 Postfix 转发样例）
- Phase 4：进行中（已完成用户钱包、冻结余额、成功扣费、超时退款、供应商待结算余额、管理员调账能力与基础结算页面；已完成供应商报表筛选、供货规则维护、管理员争议单显式筛选、供应商域名运营页、管理员供应商运营页与共享控制台深色单壳导航收敛；已完成 Webhooks / 风控 / 审计真实页面收敛与对应真实 API 回放验证；当前前端后续重点继续围绕 shared-console focused 用例去脆弱化、语义锚点收敛与 new-api 风格单壳一致性补强，再回到 Phase 4/5 余下后端能力）
- Phase 5：进行中（已完成管理员高危操作二次确认、OpenAPI + `/docs`、管理员审计查询、管理员概览/风控真实页、API Key 默认 scopes / 白名单 / Redis 全局限流 / 审计、Webhook 异步投递与 delivery 查询、风控规则 CRUD 等里程碑；后续在“前端先行、真实 API 验证、五维评审后提交”的约束下继续推进 API Key / Webhook / IP 白名单 / 限流 / 风控 / 审计余下切片）
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

### 最新执行检查点（2026-05-19，ProfilePage focused 文本断言容器收口）
- 本轮继续严格遵循“前端优先、单一登录后 shared-console/new-api 单壳、真实 API 回放、五维评审后提交”：从当前 `git status`、`todo.md` 与运行态出发，优先挑选 `web/src/pages/ProfilePage.test.tsx` 中仍依赖较细文本节点匹配的 focused 前端切片，只收口 Profile 首个 mission-control 用例的断言作用域，而不扩散到新的后端能力。目标不是改注册/登录契约、不是改 `/auth/menu` 真值、不是引入独立后台，而是在同一登录后 shared-console/new-api 单壳里，把 hero / role-focus / capability / capability-matrix / role-expansion 这些已有局部卡片的 copy proof 从节点级 `getByText/queryByText` 收口为容器级 `toHaveTextContent`，降低 Semi UI 文本包裹层变化带来的 brittle failure，同时继续保留真实共享控制台入口与角色差异菜单合同。
- 控制器按 TDD + `systematic-debugging` 先从 `ProfilePage.test.tsx` / `ProfilePage.tsx` 回读当前 focused proof，再做最小 RED→GREEN 假设：根因不是 `/profile` 路由缺失、不是 profile runtime 内容错误、不是 `/auth/menu` 漂移、不是 API Keys / Webhook / Docs 按钮落点异常，而只是测试仍把多处稳定 copy 绑定在具体文本节点级匹配上。随后仅最小修改 `web/src/pages/ProfilePage.test.tsx`：保留 `个人资料中枢`、`用户接入焦点`、`共享接入桥接`、`控制台能力矩阵`、`开发者 API 接入工作台` 等关键 heading / button / role proof，不新增任何 runtime test id，不改运行时代码，只把局部卡片中的 copy 正负向断言收口为容器级 `toHaveTextContent` / `not.toHaveTextContent`。
- 控制器验证结果：`pnpm --dir web exec vitest run src/pages/ProfilePage.test.tsx` 通过（9 tests，仅既有 React/Semi `act(...)` / `findDOMNode` warning）；`pnpm --dir web build`、`go test ./...`、`git diff --check` 全部通过。真实 API 方面新增并执行本地忽略脚本 `.hermes/local-output/profile-page-focus-real-api/run.sh`，最新产物目录 `.hermes/local-output/profile-page-focus-real-api/20260519-085545`：验证 `GET /healthz` 返回 `200 + status=ok`；动态注册普通用户返回 `201`，bearer token 可成功访问 `/auth/me`、`/auth/menu`、`/dashboard/overview`、`/auth/api-keys`、`/webhooks/endpoints`；seeded admin 登录后可成功访问 `/admin/overview`、`/admin/risk`、`/admin/audit?limit=5`；前端 `http://127.0.0.1:5173/`、`/login`、`/profile`、`/api-keys`、`/docs` 均返回 `200`。另记录：`docker compose up -d --build web api gateway` 本轮因 `Dockerfile.web` 中 `pnpm install --frozen-lockfile` 命中 `ERR_PNPM_IGNORED_BUILDS`（`esbuild@0.21.5` build scripts 未批准）失败，属于镜像环境/构建链阻塞，不影响当前已健康容器上的真实 API 与前端页面验证。
- 本轮五维评审结论：产品/规格 PASS（Profile 继续诚实表达单一登录后 shared-console/new-api 单壳与角色差异菜单，未把测试弱化成纯实现快照）；代码质量 APPROVED（当前 diff 仅集中在 1 个 focused test 文件，容器级文本断言较节点级匹配更稳健）；安全/集成 SAFE（未改 auth/session/menu/backend contract，仍保留 API Keys / Webhook / Docs 导航与 fallback 合同）；测试/可靠性 PASS（focused vitest、build、Go tests、diff-check 与真实 API 回放全部通过，且新断言仍严格限定在局部卡片容器内）；性能/运维 PASS（纯测试去脆弱化，不新增运行负担；唯一阻塞为 Docker 构建环境的 pnpm ignored-builds 配置，已如实记录）。

### 最新执行检查点（2026-05-19，ConsoleLayout 页面摘要 region + footer 合同收口）
- 本轮继续严格遵循“前端优先、单一登录后 shared-console/new-api 单壳、真实 API 回放、五维评审后提交”：从当前 `git status`、`todo.md` 与运行态出发，优先收口 `web/src/layouts/ConsoleLayout.tsx` / `web/src/components/ConsoleLayout.test.tsx` 这一层共享壳合同，而不是继续扩散到新的后端能力。目标不是改 `/auth/menu` 真值、不是改注册/登录流程、不是引入第二套后台，而是在单一登录后的共享控制台壳里，把页面摘要从普通 `group` 收口为可命名 `region`，并补上显式 `contentinfo` 页脚合同，让 header-summary / main / footer 三层语义在同一壳内更完整，也让 focused test 更贴近真实可访问树。
- 控制器先从现有 diff 与 focused proof 出发核验最小切片：当前运行时代码仅把 `console-layout-header-summary` 从 `role="group"` 提升为 `role="region" aria-label="当前页面摘要"`，并新增 `footer role="contentinfo" aria-label="共享控制台页脚"`；对应 `ConsoleLayout.test.tsx` 也只补上 `getByRole('region', { name: '当前页面摘要' })` 与 `getByRole('contentinfo')` 的合同断言。根因确认不是 shared-console 导航错误、不是 quick actions 漂移、不是登录后路由身份异常，而只是壳层语义仍少一层稳定 landmark/source of truth，需要以最小前端 diff 收口。
- 控制器验证结果：`pnpm --dir web exec vitest run src/components/ConsoleLayout.test.tsx src/pages/LoginPage.test.tsx` 通过（11 tests，仅既有 React/Semi `act(...)` / `findDOMNode` warning）；`pnpm --dir web build`、`go test ./...`、`git diff --check` 全部通过。真实 API 方面新增并修正本地忽略脚本 `.hermes/local-output/real-api-auth-menu/run.sh`，最终回放成功并产出 `.hermes/local-output/real-api-auth-menu/`：`GET /healthz` 返回 `200` 且 `status=ok` / `redis=ok`；非法注册返回 `400`；合法动态注册返回 `201`，bearer token 下 `/auth/me`、`/auth/menu`、`/dashboard/overview`、`/auth/api-keys`、`/webhooks/endpoints` 均 `200`；seeded admin 登录后 `/auth/menu` 与 `/admin/overview` 也均 `200`。期间按 `systematic-debugging` 先后修正了脚本里 curl 参数数组展开错误与邮箱大小写断言过严这两个 harness 根因，未触碰应用代码契约。
- 本轮五维评审结论：产品/规格 PASS（页面摘要与页脚语义更完整，继续诚实表达单一登录后 shared-console/new-api 单壳，而不是另起独立后台）；代码质量 APPROVED（diff 极小，仅集中在共享壳 1 个运行时文件与 1 个 focused test）；安全/集成 SAFE（未改 auth/session/menu/backend contract，真实 API 回放再次证明注册、菜单、dashboard、admin overview 稳定）；测试/可靠性 PASS（focused test、build、Go tests、diff-check 与真实 API 回放全部通过，且新增 proof 直接保护 summary-region 与 footer-contract）；性能/运维 PASS（纯语义与测试合同补强，不新增请求、轮询或部署负担，真实 API 脚本已保存在本地忽略目录供后续连续执行复用）。
