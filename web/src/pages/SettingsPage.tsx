import { Banner, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconArticle,
  IconBolt,
  IconArrowRight,
  IconSafe,
  IconServer,
  IconSetting,
  IconUser,
  IconRotate,
} from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { userFirstRunStorageKeyForUser } from './DashboardPage'
import { MenuItem, useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

const sharedFirstRunRoutes = {
  projects: PROJECTS_ROUTE,
  orders: ORDERS_ROUTE,
  apiKeys: API_KEYS_ROUTE,
} as const

interface ShortcutCard {
  title: string
  description: string
  button: string
  path: string
  tag: string
  accent: string
  icon: JSX.Element
}

interface SettingsMissionCard {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
}

interface SettingsPillar {
  key: string
  label: string
  summary: string
}

const sessionItems = [
  {
    key: '当前登录会话',
    value: 'Access Token + Refresh Token 轮换已启用',
  },
  {
    key: '控制台模式',
    value: '单一登录后控制台 / 角色扩展菜单',
  },
  {
    key: '文档入口',
    value: '/docs 与共享壳保持同域访问',
  },
]

const onboardingChecklist = [
  {
    title: '1. 先进入项目市场',
    description: '确认真实库存、成功率与价格，再决定是否立即下单。',
    path: sharedFirstRunRoutes.projects,
    button: '打开项目市场',
  },
  {
    title: '2. 回到订单中心',
    description: '下单后在共享控制台中追踪邮箱分配、提取结果和订单终态。',
    path: sharedFirstRunRoutes.orders,
    button: '查看订单中心',
  },
  {
    title: '3. 完成 API 接入准备',
    description: '继续进入 API Keys、Webhook 与 API 文档，完成程序化接入联调。',
    path: sharedFirstRunRoutes.apiKeys,
    button: '管理 API Keys',
  },
]

const sharedMissionCards: SettingsMissionCard[] = [
  {
    key: 'api-keys',
    title: '先完成 API 密钥发放',
    description: '从设置中心直接进入 API Keys，继续完成 token 发放、白名单准备与基础接入校验。',
    button: '管理 API Keys',
    path: API_KEYS_ROUTE,
    tag: 'Auth',
  },
  {
    key: 'webhooks',
    title: '继续联调回调投递',
    description: '保持在同一套共享壳内进入 Webhook 设置，配置 endpoint、验证失败重试与回调负载。',
    button: '打开 Webhook 设置',
    path: WEBHOOKS_ROUTE,
    tag: 'Callbacks',
  },
  {
    key: 'docs',
    title: '最后回到 API 文档',
    description: '利用统一导航快速跳转到 API 文档，对照真实控制台入口完成注册后接入闭环。',
    button: '打开 API 文档',
    path: DOCS_ROUTE,
    tag: 'Docs',
  },
]

const settingsPillars: SettingsPillar[] = [
  {
    key: 'dark-console',
    label: '深色共享工作台',
    summary: '设置页视觉语言与 Dashboard / Projects / Orders 对齐，不再维持浅色占位风格。',
  },
  {
    key: 'registration-flow',
    label: '注册后连续路径',
    summary: '新用户从注册、首轮引导到设置中心都留在单一控制台中继续完成接入。',
  },
  {
    key: 'canonical-routes',
    label: '规范化共享路由',
    summary: 'Docs / Webhooks / API Keys 已统一到单一壳内导航。',
  },
]

function shortcutCardStyle(accent: string) {
  return {
    height: '100%',
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
  }
}

function menuHasPath(menu: MenuItem[], path: string) {
  return menu.some((item) => item.path === path)
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()

  const reopenUserFirstRun = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(userFirstRunStorageKeyForUser(user?.id ?? null), 'false')
    }
    navigate('/')
  }

  const shortcuts = useMemo<ShortcutCard[]>(() => {
    const common: ShortcutCard[] = [
      ...(menuHasPath(menu, PROFILE_ROUTE)
        ? [{
            title: '个人资料与身份核对',
            description: '返回个人资料页确认当前角色、账号邮箱与推荐操作路径，避免角色误判导致跨区访问。',
            button: '查看个人资料',
            path: PROFILE_ROUTE,
            tag: '基础入口',
            accent: 'rgba(94,106,210,0.2)',
            icon: <IconUser />,
          }]
        : []),
      ...(menuHasPath(menu, API_KEYS_ROUTE)
        ? [{
            title: 'API 接入入口',
            description: '快速跳转 API Keys 完成 token、白名单与回调前置准备，再从顶栏与侧边栏进入 API 文档。',
            button: '管理 API Keys',
            path: API_KEYS_ROUTE,
            tag: '集成入口',
            accent: 'rgba(16,185,129,0.18)',
            icon: <IconArticle />,
          }]
        : []),
      ...(menuHasPath(menu, WEBHOOKS_ROUTE)
        ? [{
            title: 'Webhook 回调工作台',
            description: '在共享控制台中直接维护 endpoint、测试投递与 delivery 状态，保持与 API Keys、文档同层级联动。',
            button: '打开 Webhook 设置',
            path: WEBHOOKS_ROUTE,
            tag: '共享入口',
            accent: 'rgba(14,165,233,0.18)',
            icon: <IconBolt />,
          }]
        : []),
    ]

    switch (user?.role) {
      case 'admin':
        return [
          ...(menuHasPath(menu, '/admin/risk')
            ? [{
                title: '风险规则联动',
                description: '进入风控中心查看高风险信号、规则阈值与运行时效果，确认限流、白名单与告警链路一致。',
                button: '前往风控中心',
                path: '/admin/risk',
                tag: '管理员',
                accent: 'rgba(239,68,68,0.16)',
                icon: <IconSafe />,
              }]
            : []),
          ...(menuHasPath(menu, '/admin/audit')
            ? [{
                title: '审计追踪',
                description: '查看 API Key 生命周期、结算、调账与争议处理审计，保证高危动作可追踪可回放。',
                button: '查看审计日志',
                path: '/admin/audit',
                tag: '管理员',
                accent: 'rgba(249,115,22,0.18)',
                icon: <IconBolt />,
              }]
            : []),
          ...(menuHasPath(menu, WEBHOOKS_ROUTE)
            ? [{
                title: 'Webhook 观测',
                description: '通过管理员共享入口查看回调 endpoint、投递记录与失败重试状态，避免跨后台切换。',
                button: '打开 Webhook 设置',
                path: WEBHOOKS_ROUTE,
                tag: '管理员',
                accent: 'rgba(14,165,233,0.18)',
                icon: <IconServer />,
              }]
            : []),
          ...common,
        ]
      case 'supplier':
        return [
          ...(menuHasPath(menu, '/supplier/resources')
            ? [{
                title: '资源供给维护',
                description: '进入供应商资源页维护邮箱账号、协议配置与健康状态，确保供给链路稳定。',
                button: '查看供应商资源',
                path: '/supplier/resources',
                tag: '供应商',
                accent: 'rgba(16,185,129,0.18)',
                icon: <IconServer />,
              }]
            : []),
          ...(menuHasPath(menu, '/supplier/settlements')
            ? [{
                title: '供货与结算闭环',
                description: '从供货规则到供应商结算页形成闭环，及时修正售价、成功率与回款观察。',
                button: '前往供应商结算',
                path: '/supplier/settlements',
                tag: '供应商',
                accent: 'rgba(94,106,210,0.18)',
                icon: <IconSetting />,
              }]
            : []),
          ...common,
        ]
      default:
        return [
          ...(menuHasPath(menu, PROJECTS_ROUTE)
            ? [{
                title: '项目采购入口',
                description: '从项目市场继续采购资源，并在订单中心与余额中心查看后续执行结果。',
                button: '前往项目市场',
                path: PROJECTS_ROUTE,
                tag: '用户',
                accent: 'rgba(14,165,233,0.18)',
                icon: <IconServer />,
              }]
            : []),
          ...(menuHasPath(menu, ORDERS_ROUTE)
            ? [{
                title: '订单与回调观察',
                description: '通过订单中心观察邮箱分配、提取结果和完成状态，再结合 API 文档完成系统集成。',
                button: '查看订单中心',
                path: ORDERS_ROUTE,
                tag: '用户',
                accent: 'rgba(94,106,210,0.18)',
                icon: <IconBolt />,
              }]
            : []),
          ...common,
        ]
    }
  }, [menu, user?.role])

  const missionCards = useMemo(() => sharedMissionCards.filter((item) => menuHasPath(menu, item.path)), [menu])

  const capabilitySignals = useMemo(
    () => [
      { key: '账号入口', value: menuHasPath(menu, PROFILE_ROUTE) ? '已连接到个人资料与角色核对' : '等待角色入口' },
      { key: '集成入口', value: menuHasPath(menu, API_KEYS_ROUTE) ? 'API Keys / 白名单入口已启用' : '等待 API 接入能力' },
      { key: '回调入口', value: menuHasPath(menu, WEBHOOKS_ROUTE) ? 'Webhook 工作台已在共享控制台内可用' : '等待 Webhook 能力' },
      { key: '文档入口', value: menuHasPath(menu, DOCS_ROUTE) ? 'API 文档已并入共享导航' : '等待文档入口' },
    ],
    [menu],
  )

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.92) 58%, rgba(30,41,59,0.92) 100%)',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.36)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Console Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>设置中心</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 820 }}>
                接入与账户设置不再停留在浅色占位页，而是收敛为与仪表盘一致的深色共享控制台工作台。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">单一登录后控制台</Tag>
              <Tag color="green">注册后连续路径</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="这里聚焦当前已交付的真实入口：会话轮换、角色壳切换、API 文档、风控/审计/Webhook/供货运营，不展示会误导用户的伪设置项。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {settingsPillars.map((item) => (
              <Col xs={24} md={8} key={item.key}>
                <Card
                  style={{
                    height: '100%',
                    borderRadius: 20,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                    border: '1px solid rgba(148,163,184,0.16)',
                    boxShadow: 'rgba(0,0,0,0.18) 0px 0px 0px 1px',
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                    <Typography.Text strong style={{ color: '#f8fafc', fontSize: 15 }}>{item.label}</Typography.Text>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.72)', minHeight: 66 }}>
                      {item.summary}
                    </Typography.Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card
            title={<span style={{ color: '#f8fafc' }}>集成任务流</span>}
            style={{ width: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[16, 16]}>
              {missionCards.map((item) => (
                <Col xs={24} md={8} key={item.key}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                      border: '1px solid rgba(94,106,210,0.24)',
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                      <Tag color="cyan">{item.tag}</Tag>
                      <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{item.title}</Typography.Title>
                      <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.72)', minHeight: 88 }}>
                        {item.description}
                      </Typography.Paragraph>
                      <Button icon={<IconArrowRight />} type="primary" theme="solid" onClick={() => navigate(item.path)}>
                        {item.button}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            title={<span style={{ color: '#f8fafc' }}>控制台能力矩阵</span>}
            style={{ height: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            bodyStyle={{ padding: 20 }}
          >
            <Descriptions data={capabilitySignals} align="left" />
          </Card>
        </Col>
      </Row>

      {user?.role === 'user' ? (
        <Card title="首次使用清单" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
          <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
            <Banner
              type="info"
              fullMode={false}
              description="新注册普通用户建议先完成项目市场、订单中心与 API 接入三步；供应商 / 管理员能力会在后续角色扩展时出现在同一套共享控制台内。"
              style={{ width: '100%' }}
            />
            <Button icon={<IconRotate />} theme="solid" type="primary" onClick={reopenUserFirstRun}>
              重新打开首轮引导
            </Button>
            <Row gutter={[16, 16]} style={{ width: '100%' }}>
              {onboardingChecklist.map((item) => (
                <Col xs={24} md={8} key={item.title}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
                      border: '1px solid rgba(94,106,210,0.12)',
                      boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                      <Typography.Title heading={5} style={{ margin: 0 }}>{item.title}</Typography.Title>
                      <Typography.Paragraph style={{ margin: 0, color: '#475569', minHeight: 66 }}>
                        {item.description}
                      </Typography.Paragraph>
                      <Button type="primary" theme="solid" onClick={() => navigate(item.path)}>
                        {item.button}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        </Card>
      ) : null}

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={8}>
          <Card
            title="当前登录会话"
            style={{ height: '100%', borderRadius: 24 }}
            bodyStyle={{ padding: 20 }}
          >
            <Descriptions data={sessionItems} align="left" />
            <div style={{ marginTop: 16 }}>
              <Tag color="blue">{user?.role ?? 'guest'}</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card
            title="控制台运行快捷入口"
            style={{ width: '100%', borderRadius: 24 }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[16, 16]}>
              {shortcuts.map((item) => (
                <Col xs={24} md={12} key={item.title}>
                  <Card style={shortcutCardStyle(item.accent)} bodyStyle={{ padding: 18 }}>
                    <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Title heading={5} style={{ margin: 0 }}>{item.title}</Typography.Title>
                        <Tag color="cyan">{item.tag}</Tag>
                      </Space>
                      <Tag color="grey" prefixIcon={item.icon}>{item.button}</Tag>
                      <Typography.Paragraph style={{ margin: 0, color: '#475569', minHeight: 72 }}>{item.description}</Typography.Paragraph>
                      <Button type="primary" theme="solid" onClick={() => navigate(item.path)}>
                        {item.button}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
