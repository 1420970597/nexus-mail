import { Banner, Button, Card, Col, Empty, Row, Space, Table, Tag, Timeline, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArticle,
  IconHistogram,
  IconSafe,
  IconServer,
  IconSetting,
  IconArrowRight,
  IconRotate,
} from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminOverview, getDashboardOverview, AdminOverviewResponse, DashboardOverviewResponse } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, BALANCE_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

export function userFirstRunStorageKeyForUser(userId?: number | null) {
  return `nexus-mail-user-first-run-dismissed:${userId ?? 'guest'}`
}

const sharedFirstRunRoutes = {
  projects: PROJECTS_ROUTE,
  orders: ORDERS_ROUTE,
  apiKeys: API_KEYS_ROUTE,
  settings: SETTINGS_ROUTE,
} as const

interface FirstRunStep {
  key: string
  title: string
  description: string
  path: string
  action: string
}

interface FirstRunMissionCard {
  key: string
  title: string
  description: string
  tag: string
  path: string
  button: string
}

interface RecommendedNextStep {
  key: string
  title: string
  description: string
  path: string
  button: string
  tag: string
}

const firstRunMissionCards: FirstRunMissionCard[] = [
  {
    key: 'procurement',
    title: '先完成基础采购路径',
    description: '从项目市场确认真实库存与价格，再进入订单中心完成首次下单与结果追踪。',
    tag: 'Shared Console',
    path: sharedFirstRunRoutes.projects,
    button: '前往项目市场开始采购',
  },
  {
    key: 'integration',
    title: '继续准备 API 接入',
    description: '在同一套深色工作台里继续进入 API Keys、Webhook 与 API 文档，完成自动化联调。',
    tag: 'Integration',
    path: sharedFirstRunRoutes.apiKeys,
    button: '管理 API Keys',
  },
  {
    key: 'roles',
    title: '后续角色能力仍在同一壳内扩展',
    description: '如果后续被服务端授予供应商或管理员角色，菜单会按权限扩展，不需要切换独立后台。',
    tag: 'Role-aware',
    path: sharedFirstRunRoutes.settings,
    button: '查看角色与控制台说明',
  },
]

const firstRunSteps: FirstRunStep[] = [
  {
    key: 'projects',
    title: '先去项目市场确认真实库存',
    description: '浏览项目、库存、成功率与价格，明确当前可以采购的资源组合。',
    path: sharedFirstRunRoutes.projects,
    action: '打开项目市场',
  },
  {
    key: 'orders',
    title: '回到订单中心追踪执行结果',
    description: '下单后在同一控制台里跟踪邮箱分配、提取结果、READY/FINISHED 等真实状态。',
    path: sharedFirstRunRoutes.orders,
    action: '查看订单中心',
  },
  {
    key: 'integrate',
    title: '完成 API 接入准备',
    description: '继续进入 API Keys、Webhook 与 API 文档，完成自动化接入与回调联调准备。',
    path: sharedFirstRunRoutes.apiKeys,
    action: '管理 API Keys',
  },
]

function recommendedNextSteps(menu: MenuItem[]): RecommendedNextStep[] {
  const itemsByPath = new Map(menu.map((item) => [item.path, item]))
  const steps: RecommendedNextStep[] = []

  if (itemsByPath.has(BALANCE_ROUTE)) {
    steps.push({
      key: 'balance',
      title: '先确认预算与钱包状态',
      description: '先去余额中心确认可用余额、冻结金额与最近流水，再决定是否立即采购或补款。',
      path: BALANCE_ROUTE,
      button: '查看余额中心',
      tag: 'Budget',
    })
  }

  if (itemsByPath.has(PROJECTS_ROUTE)) {
    steps.push({
      key: 'projects',
      title: '再进入项目市场采购',
      description: '对照真实库存、成功率与价格，决定第一笔订单应该从哪个项目与域名池开始。',
      path: PROJECTS_ROUTE,
      button: '前往项目市场',
      tag: 'Procurement',
    })
  }

  if (itemsByPath.has(ORDERS_ROUTE)) {
    steps.push({
      key: 'orders',
      title: '随后追踪订单履约',
      description: '在订单中心跟踪邮箱分配、提取结果与 READY / FINISHED 终态，保持履约反馈留在同一壳内。',
      path: ORDERS_ROUTE,
      button: '查看订单中心',
      tag: 'Fulfillment',
    })
  }

  if (itemsByPath.has(API_KEYS_ROUTE)) {
    const integrationDest = itemsByPath.has(WEBHOOKS_ROUTE)
      ? 'API Keys、Webhook 与文档'
      : itemsByPath.has(DOCS_ROUTE)
        ? 'API Keys 与文档'
        : 'API Keys'
    steps.push({
      key: 'api-keys',
      title: '最后完成 API 接入',
      description: `继续进入 ${integrationDest}，完成程序化调用、回调联调与真实接口验证准备。`,
      path: API_KEYS_ROUTE,
      button: '管理 API Keys',
      tag: 'Integration',
    })
  }

  return steps
}

function amountLabel(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function percentLabel(value: number) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`
}

function metricCardStyle(accent: string) {
  return {
    height: '100%',
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: 'rgba(0,0,0,0.2) 0px 0px 0px 1px',
  }
}

interface RoleAction {
  key: string
  title: string
  description: string
  path: string
  button: string
  icon: JSX.Element
  accent: string
}

interface RoleMissionStep {
  key: string
  title: string
  description: string
}

interface RoleSurfaceItem {
  label: string
  route: string
  summary: string
}

function roleActions(menu: MenuItem[], role?: string): RoleAction[] {
  const itemsByPath = new Map(menu.map((item) => [item.path, item]))

  if (role === 'admin') {
    const actions: RoleAction[] = []
    if (itemsByPath.has('/admin/suppliers')) {
      actions.push({
        key: 'admin-suppliers',
        title: '经营与供应商运营',
        description: '优先查看供应商待结算、完成率和争议处置入口，保持管理动作在同一控制台内闭环。',
        path: '/admin/suppliers',
        button: '前往供应商管理',
        icon: <IconServer />,
        accent: 'rgba(113, 112, 255, 0.28)',
      })
    }
    if (itemsByPath.has('/admin/risk')) {
      actions.push({
        key: 'admin-risk',
        title: '风险与审计联动',
        description: '把 API Key 风险、白名单拦截、限流拒绝与审计事件串联观察，不再切换独立后台。',
        path: '/admin/risk',
        button: '进入风控中心',
        icon: <IconSafe />,
        accent: 'rgba(239, 68, 68, 0.24)',
      })
    }
    if (itemsByPath.has('/webhooks')) {
      actions.push({
        key: 'webhooks',
        title: '共享接入入口',
        description: '通过 API 文档与 Webhook 设置继续对外联调，兼顾产品运营与平台接入。',
        path: '/webhooks',
        button: '打开 Webhook 工作台',
        icon: <IconArticle />,
        accent: 'rgba(14, 165, 233, 0.24)',
      })
    }
    return actions
  }

  if (role === 'supplier') {
    const actions: RoleAction[] = []
    if (itemsByPath.has('/supplier/domains')) {
      actions.push({
        key: 'supplier-domains',
        title: '域名池运营',
        description: '先维护域名池与 Catch-All 覆盖，再回到资源与供货规则页收敛供给质量。',
        path: '/supplier/domains',
        button: '前往域名管理',
        icon: <IconServer />,
        accent: 'rgba(16, 185, 129, 0.24)',
      })
    }
    if (itemsByPath.has('/supplier/offerings')) {
      actions.push({
        key: 'supplier-offerings',
        title: '供货与履约',
        description: '围绕订单履约、库存消耗与成功率调整供货规则，保持供给侧动作集中。',
        path: '/supplier/offerings',
        button: '调整供货规则',
        icon: <IconActivity />,
        accent: 'rgba(113, 112, 255, 0.28)',
      })
    }
    if (itemsByPath.has('/supplier/settlements')) {
      actions.push({
        key: 'supplier-settlements',
        title: '结算与观察',
        description: '随时检查待结算余额与运营结果，减少供应商在多页面之间往返。',
        path: '/supplier/settlements',
        button: '查看结算页',
        icon: <IconHistogram />,
        accent: 'rgba(249, 115, 22, 0.26)',
      })
    }
    return actions
  }

  const actions: RoleAction[] = []
  if (itemsByPath.has('/projects')) {
    actions.push({
      key: 'projects',
      title: '开始采购',
      description: '从项目市场快速进入真实库存与定价，再直接创建订单进入统一流程。',
      path: '/projects',
      button: '前往项目市场',
      icon: <IconServer />,
      accent: 'rgba(14, 165, 233, 0.24)',
    })
  }
  if (itemsByPath.has('/orders')) {
    actions.push({
      key: 'orders',
      title: '追踪订单结果',
      description: '在订单中心查看邮箱分配、提取结果和完成状态，避免跳到独立后台查看。',
      path: '/orders',
      button: '查看订单中心',
      icon: <IconActivity />,
      accent: 'rgba(113, 112, 255, 0.28)',
    })
  }
  if (itemsByPath.has(API_KEYS_ROUTE)) {
    const docsLabel = itemsByPath.has(DOCS_ROUTE) ? '文档' : '接口说明'
    const webhookLabel = itemsByPath.has(WEBHOOKS_ROUTE) ? 'Webhook' : '回调'
    actions.push({
      key: 'api-keys',
      title: '集成与回调',
      description: `继续配置 API Keys、${webhookLabel} 与 ${docsLabel}，完成对外 API / Webhook 对接。`,
      path: API_KEYS_ROUTE,
      button: '管理 API Keys',
      icon: <IconSetting />,
      accent: 'rgba(16, 185, 129, 0.24)',
    })
  }
  return actions
}

function roleHeadline(role?: string) {
  switch (role) {
    case 'admin':
      return '管理员主任务'
    case 'supplier':
      return '供应商主任务'
    default:
      return '用户主任务'
  }
}

function roleMissionSteps(role?: string): RoleMissionStep[] {
  switch (role) {
    case 'admin':
      return [
        { key: 'overview', title: '先看经营概览', description: '确认争议、超时订单、待结算金额与鉴权拒绝率是否异常。' },
        { key: 'risk', title: '再进风控与审计', description: '沿着风控中心和审计日志定位高风险动作与供应商表现。' },
        { key: 'operate', title: '最后回到运营入口', description: '进入供应商管理或 Webhook 工作台继续处理履约和接入联动。' },
      ]
    case 'supplier':
      return [
        { key: 'domains', title: '维护域名池', description: '优先检查域名池、Catch-All 覆盖与可用性，稳定供给起点。' },
        { key: 'offerings', title: '调整供货规则', description: '根据库存、成功率与履约结果回到供货规则页优化价格和可售状态。' },
        { key: 'settlements', title: '关注结算结果', description: '在供应商结算页追踪待结算余额与产出效率，形成供给闭环。' },
      ]
    default:
      return [
        { key: 'projects', title: '浏览项目市场', description: '先确认真实库存、定价与可售项目，再进入采购流程。' },
        { key: 'orders', title: '跟踪订单执行', description: '在订单中心查看邮箱分配、提取结果与完成状态。' },
        { key: 'integrate', title: '完成 API 集成', description: '继续配置 API Keys、Webhook 与文档访问，打通系统接入。' },
      ]
  }
}

function roleSurface(menu: MenuItem[], role?: string): RoleSurfaceItem[] {
  const itemsByPath = new Map(menu.map((item) => [item.path, item]))

  if (role === 'admin') {
    const surfaces: RoleSurfaceItem[] = [{ label: '基础工作台', route: '/', summary: '总览、共享入口与实时概览都从这里开始。' }]
    if (itemsByPath.has('/admin/risk')) {
      surfaces.push({ label: '管理员扩展', route: '/admin/risk', summary: '风控中心、审计日志、供应商管理等管理动作在此展开。' })
    }
    if (itemsByPath.has('/webhooks')) {
      surfaces.push({ label: '共享接入', route: '/webhooks', summary: 'Webhook 与 API 文档仍留在共享控制台内。' })
    }
    return surfaces
  }

  if (role === 'supplier') {
    const surfaces: RoleSurfaceItem[] = [{ label: '基础工作台', route: '/', summary: '总览页先聚合供给侧最重要的下一步动作。' }]
    if (itemsByPath.has('/supplier/domains')) {
      surfaces.push({ label: '供应商扩展', route: '/supplier/domains', summary: '域名池、资源、供货规则与结算围绕供给闭环展开。' })
    }
    if (itemsByPath.has('/settings')) {
      surfaces.push({ label: '共享接入', route: '/settings', summary: '设置中心继续连接 Webhook、API Keys 与共享会话说明。' })
    }
    return surfaces
  }

  const surfaces: RoleSurfaceItem[] = [{ label: '基础工作台', route: '/', summary: '总览页负责把采购、订单与集成入口组织在同一壳里。' }]
  if (itemsByPath.has('/projects')) {
    surfaces.push({ label: '采购执行', route: '/projects', summary: '项目市场与订单中心承接真实购买链路。' })
  }
  if (itemsByPath.has(API_KEYS_ROUTE)) {
    surfaces.push({ label: '集成入口', route: API_KEYS_ROUTE, summary: 'API Keys、Webhook 与文档是共享控制台中的接入层。' })
  }
  return surfaces
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null)
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null)
  const [message, setMessage] = useState('正在加载概览数据...')
  const [showUserFirstRun, setShowUserFirstRun] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (user?.role !== 'user') {
      setShowUserFirstRun(false)
      return
    }
    const dismissed = window.localStorage.getItem(userFirstRunStorageKeyForUser(user?.id ?? null)) === 'true'
    setShowUserFirstRun(!dismissed)
  }, [user?.id, user?.role])

  useEffect(() => {
    let active = true
    getDashboardOverview()
      .then(async (res) => {
        if (!active) return
        setOverview(res)
        setMessage(res.message ?? '实时概览已加载')
        if (user?.role === 'admin') {
          const adminRes = await getAdminOverview()
          if (!active) return
          setAdminOverview(adminRes)
        }
      })
      .catch(() => {
        if (!active) return
        setMessage('实时概览加载失败，请稍后重试')
      })
    return () => {
      active = false
    }
  }, [user?.role])

  const adminSummary = adminOverview?.summary
  const topSupplier = useMemo(() => adminOverview?.suppliers?.[0], [adminOverview])
  const actions = useMemo(() => roleActions(menu, user?.role), [menu, user?.role])
  const nextSteps = useMemo(() => recommendedNextSteps(menu), [menu])
  const missionSteps = useMemo(() => roleMissionSteps(user?.role), [user?.role])
  const roleSurfaceItems = useMemo(() => roleSurface(menu, user?.role), [menu, user?.role])

  const dismissUserFirstRun = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(userFirstRunStorageKeyForUser(user?.id ?? null), 'true')
    }
    setShowUserFirstRun(false)
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(17,24,39,0.9) 58%, rgba(15,16,17,0.96) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Shared Console Entry</Tag>
          <div>
            <Typography.Title heading={2} style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.6px' }}>
              控制台总览
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.82)', marginBottom: 0, maxWidth: 860, fontSize: 16 }}>
              登录后先在这里确认实时经营指标、角色可执行动作与关键跳转入口，再继续进入采购、供给、风控、审计与对外集成页面。
            </Typography.Paragraph>
          </div>
          <Banner
            fullMode={false}
            type="info"
            title={`欢迎回来，${user?.email ?? '访客'}`}
            description={message}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d6e0' }}
          />
          {user?.role === 'user' && showUserFirstRun ? (
            <Card
              style={{
                width: '100%',
                borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(94,106,210,0.24) 0%, rgba(15,23,42,0.96) 54%, rgba(8,9,10,0.98) 100%)',
                border: '1px solid rgba(125,211,252,0.24)',
                boxShadow: '0 26px 60px rgba(2, 6, 23, 0.28)',
              }}
              bodyStyle={{ padding: 24 }}
            >
              <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                  <Space vertical align="start" spacing={8}>
                    <Tag color="cyan" shape="circle">First Run Mission</Tag>
                    <div>
                      <Typography.Title heading={3} style={{ color: '#f7f8f8', margin: '0 0 8px' }}>
                        欢迎进入共享控制台
                      </Typography.Title>
                      <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.82)', margin: 0, maxWidth: 860 }}>
                        当前角色：普通用户。先走通采购、订单与接入三步，再在同一套工作台里继续扩展角色能力。
                      </Typography.Paragraph>
                    </div>
                  </Space>
                  <Button theme="borderless" icon={<IconRotate />} style={{ color: '#d0d6e0' }} onClick={dismissUserFirstRun}>
                    稍后再看
                  </Button>
                </Space>

                <Row gutter={[16, 16]} style={{ width: '100%' }}>
                  {firstRunMissionCards.map((card) => (
                    <Col xs={24} xl={8} key={card.key}>
                      <Card
                        style={{
                          height: '100%',
                          borderRadius: 20,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                        bodyStyle={{ padding: 18 }}
                      >
                        <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                          <Tag color="grey">{card.tag}</Tag>
                          <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>
                            {card.title}
                          </Typography.Title>
                          <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)', minHeight: 72 }}>
                            {card.description}
                          </Typography.Paragraph>
                          <Button
                            type="primary"
                            theme="solid"
                            icon={<IconArrowRight />}
                            onClick={() => navigate(card.path)}
                            style={{ background: '#5e6ad2', borderRadius: 10 }}
                          >
                            {card.button}
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Row gutter={[16, 16]} style={{ width: '100%' }}>
                  {firstRunSteps.map((step, index) => (
                    <Col xs={24} lg={8} key={step.key}>
                      <Card
                        style={{
                          height: '100%',
                          borderRadius: 18,
                          background: 'rgba(2,6,23,0.32)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        bodyStyle={{ padding: 18 }}
                      >
                        <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                          <Tag color="blue">步骤 {index + 1}</Tag>
                          <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>
                            {step.title}
                          </Typography.Title>
                          <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)', minHeight: 72 }}>
                            {step.description}
                          </Typography.Paragraph>
                          <Button type="primary" theme="borderless" onClick={() => navigate(step.path)} style={{ color: '#93c5fd' }}>
                            {step.action}
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Space wrap>
                  <Tag color="grey">统一控制台内完成首次使用，不跳转独立新手后台</Tag>
                  <Tag color="grey">供应商 / 管理员能力属于后续角色扩展，不影响当前首轮路径</Tag>
                </Space>
              </Space>
            </Card>
          ) : null}
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {actions.map((item) => (
              <Col xs={24} lg={8} key={item.title}>
                <Card style={metricCardStyle(item.accent)} bodyStyle={{ padding: 18 }}>
                  <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                    <Tag color="grey" prefixIcon={item.icon}>{item.title}</Tag>
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>
                      {item.title}
                    </Typography.Title>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)', minHeight: 66 }}>
                      {item.description}
                    </Typography.Paragraph>
                    <Button type="primary" theme="solid" onClick={() => navigate(item.path)} style={{ background: '#5e6ad2', borderRadius: 10 }}>
                      {item.button}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        {user?.role === 'user' && nextSteps.length > 0 ? (
          <Col xs={24}>
            <Card data-testid="dashboard-next-steps-lane" style={metricCardStyle('rgba(16,185,129,0.24)')} bodyStyle={{ padding: 22 }}>
              <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                <div>
                  <Tag color="green">推荐下一步</Tag>
                  <Typography.Title heading={4} style={{ margin: '12px 0 6px', color: '#f7f8f8' }}>
                    预算 → 采购 → 履约 → 接入
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)' }}>
                    采购 → 订单 → 接入 的首轮路径，会与余额中心保持同一套推荐顺序。
                  </Typography.Paragraph>
                </div>
                <Row gutter={[16, 16]} style={{ width: '100%' }}>
                  {nextSteps.map((step) => (
                    <Col xs={24} md={12} xl={6} key={step.key}>
                      <Card
                        style={{
                          height: '100%',
                          borderRadius: 18,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        bodyStyle={{ padding: 18 }}
                      >
                        <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                          <Tag color="grey">{step.tag}</Tag>
                          <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>
                            {step.title}
                          </Typography.Title>
                          <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)', minHeight: 72 }}>
                            {step.description}
                          </Typography.Paragraph>
                          <Button type="primary" theme="borderless" onClick={() => navigate(step.path)} style={{ color: '#86efac' }}>
                            {step.button}
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            </Card>
          </Col>
        ) : null}
        <Col xs={24} xl={14}>
          <Card style={metricCardStyle('rgba(94,106,210,0.24)')} bodyStyle={{ padding: 22 }}>
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              <div>
                <Tag color="blue">角色工作台导引</Tag>
                <Typography.Title heading={4} style={{ margin: '12px 0 6px', color: '#f7f8f8' }}>
                  {roleHeadline(user?.role)}
                </Typography.Title>
                <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)' }}>
                  基于现有真实路由组织接下来的执行顺序，帮助当前角色在共享壳中快速进入主任务。
                </Typography.Paragraph>
              </div>
              <Timeline mode="left">
                {missionSteps.map((step) => (
                  <Timeline.Item key={step.key} time={step.title}>
                    <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{step.description}</Typography.Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card style={metricCardStyle('rgba(14,165,233,0.24)')} bodyStyle={{ padding: 22 }}>
            <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
              <div>
                <Tag color="cyan">共享壳中的角色菜单映射</Tag>
                <Typography.Paragraph style={{ margin: '12px 0 0', color: 'rgba(208,214,224,0.72)' }}>
                  当前菜单与页面能力以服务端返回的角色权限与菜单结果为准，以下跳转全部对应现有真实路由。
                </Typography.Paragraph>
              </div>
              {roleSurfaceItems.map((item) => (
                <Card key={item.label} bodyStyle={{ padding: 16 }} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Space vertical align="start" spacing={8} style={{ width: '100%' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Typography.Text strong style={{ color: '#f7f8f8' }}>{item.label}</Typography.Text>
                      <Tag color="grey">{item.route}</Tag>
                    </Space>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)' }}>{item.summary}</Typography.Paragraph>
                    <Button theme="borderless" type="primary" onClick={() => navigate(item.route)}>
                      打开该工作台
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={8}>
          <Card title="当前角色" style={metricCardStyle('rgba(94,106,210,0.28)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{user?.role ?? 'guest'}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>当前菜单与页面能力将随角色动态变化</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="项目供给数" style={metricCardStyle('rgba(14,165,233,0.24)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{overview?.stats?.projects ?? 0}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>可售项目 / 库存聚合概览</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="供应商数" style={metricCardStyle('rgba(16,185,129,0.24)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{overview?.stats?.suppliers ?? 0}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>支撑当前市场供给的供应商主体</Typography.Text>
          </Card>
        </Col>
      </Row>

      {user?.role === 'admin' && adminSummary ? (
        <>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="钱包用户数" style={metricCardStyle('rgba(59,130,246,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.users.total}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>已开通钱包能力的用户</Typography.Text></Card></Col>
            <Col span={6}><Card title="开放争议单" style={metricCardStyle('rgba(249,115,22,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.disputes.open}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>建议优先处置的争议工单</Typography.Text></Card></Col>
            <Col span={6}><Card title="超时订单" style={metricCardStyle('rgba(239,68,68,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.orders.timeout}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>影响履约与风控的超时订单</Typography.Text></Card></Col>
            <Col span={6}><Card title="待结算金额" style={metricCardStyle('rgba(16,185,129,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.supplier_settlements.pending_amount)}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>待管理员确认的供应商结算余额</Typography.Text></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="订单完成率" style={metricCardStyle('rgba(59,130,246,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.completion_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单超时率" style={metricCardStyle('rgba(249,115,22,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.timeout_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单取消率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.cancel_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="争议发生率" data-testid="dashboard-dispute-rate-card" style={metricCardStyle('rgba(168,85,247,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.disputes.dispute_rate_bps)}</Typography.Title></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={8}><Card title="已完成订单流水" data-testid="dashboard-finished-revenue-card" style={metricCardStyle('rgba(16,185,129,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.orders.gross_revenue)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="平均完成客单价" style={metricCardStyle('rgba(14,165,233,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.orders.average_finished_order_value)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="鉴权拒绝率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.audit.denied_rate_bps)}</Typography.Title></Card></Col>
          </Row>

          <Card title="管理员运营摘要" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue">项目：{adminSummary.projects.active}/{adminSummary.projects.total} 启用</Tag>
              <Tag color="green">完成订单：{adminSummary.orders.finished}</Tag>
              <Tag color="orange">取消订单：{adminSummary.orders.canceled}</Tag>
              <Tag color="red">白名单拦截：{adminSummary.audit.denied_whitelist}</Tag>
              <Tag color="red">限流拦截：{adminSummary.audit.denied_rate_limit}</Tag>
              <Tag color="red">鉴权拒绝总数：{adminSummary.audit.denied_total}</Tag>
            </Space>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button theme="solid" type="primary" onClick={() => navigate('/admin/suppliers')}>前往供应商管理查看详情</Button>
              <Button onClick={() => navigate('/admin/risk')}>前往风控中心</Button>
              <Button onClick={() => navigate('/admin/audit')}>前往审计日志</Button>
            </div>
          </Card>

          {topSupplier ? (
            <Card title="当前重点关注供应商" style={{ width: '100%' }} data-testid="dashboard-top-supplier-card">
              <Space wrap>
                <Tag color="red">{topSupplier.email}</Tag>
                <Tag color="orange">待结算：{amountLabel(topSupplier.pending_settlement)}</Tag>
                <Tag color="blue">完成率：{percentLabel(topSupplier.completion_rate_bps)}</Tag>
                <Tag color="green">完成流水：{amountLabel(topSupplier.gross_revenue)}</Tag>
              </Space>
            </Card>
          ) : (
            <Card title="当前重点关注供应商" style={{ width: '100%' }} data-testid="dashboard-top-supplier-card">
              <Empty description="暂无供应商聚合数据" />
            </Card>
          )}

          <Card title="供应商待结算排行" style={{ width: '100%' }} data-testid="dashboard-supplier-settlement-rank-card">
            <Table
              pagination={false}
              rowKey="user_id"
              dataSource={adminOverview?.suppliers ?? []}
              columns={[
                { title: '供应商 ID', dataIndex: 'user_id', key: 'user_id' },
                { title: '邮箱', dataIndex: 'email', key: 'email' },
                { title: '待结算金额', dataIndex: 'pending_settlement', key: 'pending_settlement', render: (value) => amountLabel(Number(value || 0)) },
                { title: '订单数', dataIndex: 'order_total', key: 'order_total' },
                { title: '完成/超时/取消', key: 'status_breakdown', render: (_, record) => `${record.finished_orders}/${record.timeout_orders}/${record.canceled_orders}` },
                { title: '完成率', dataIndex: 'completion_rate_bps', key: 'completion_rate_bps', render: (value) => percentLabel(Number(value || 0)) },
                { title: '完成流水', dataIndex: 'gross_revenue', key: 'gross_revenue', render: (value) => amountLabel(Number(value || 0)) },
              ]}
            />
          </Card>
        </>
      ) : null}
    </Space>
  )
}
