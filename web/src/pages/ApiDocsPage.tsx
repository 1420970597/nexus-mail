import { Button, Card, Col, Row, Space, Tag, Timeline, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconArticle, IconArrowRight, IconBolt, IconPriceTag, IconSafe, IconServer } from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, BALANCE_ROUTE, DOCS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

interface DocsActionCard {
  key: string
  title: string
  description: string
  path: string
  button: string
  icon: JSX.Element
  accent: string
}

interface DocsFlowStep {
  key: string
  title: string
  description: string
}

interface SharedConsoleBridgeCard {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
  accent: string
}

const sharedConsoleBridgeCards: SharedConsoleBridgeCard[] = [
  {
    key: 'projects',
    title: '回到项目市场校验真实业务输入',
    description: '先确认项目、库存与价格，再带着真实采购语境回来看接入契约，避免把文档孤立成只读页。',
    button: '查看项目市场基线',
    path: PROJECTS_ROUTE,
    tag: 'Marketplace',
    accent: 'rgba(14, 165, 233, 0.24)',
  },
  {
    key: 'api-keys',
    title: '收敛最小权限 API Key',
    description: '继续在同一控制台发放最小权限 Key、核对白名单与限流语义，再进入真实回放。',
    button: '打开 API Keys 工作台',
    path: API_KEYS_ROUTE,
    tag: 'Credentials',
    accent: 'rgba(94, 106, 210, 0.28)',
  },
  {
    key: 'webhooks',
    title: '完成 Webhook 回调联调',
    description: '保持 API Keys → Webhooks → Docs 的顺序，先确认回调 payload、签名与 delivery 状态，再继续业务页验证。',
    button: '打开 Webhook 设置',
    path: WEBHOOKS_ROUTE,
    tag: 'Callbacks',
    accent: 'rgba(16, 185, 129, 0.24)',
  },
  {
    key: 'balance',
    title: '返回资金工作台核对预算与售后',
    description: '将文档中的资金、争议与余额相关接口重新映射到共享控制台的 Finance Mission Control，避免接入与售后割裂。',
    button: '打开余额中心',
    path: BALANCE_ROUTE,
    tag: 'Finance',
    accent: 'rgba(249, 115, 22, 0.24)',
  },
]

function roleCopy(role?: string) {
  switch (role) {
    case 'admin':
      return {
        badge: '管理员扩展 · API 契约',
        title: 'Docs Mission Control',
        description: '审计与风控仍通过共享控制台中的 API Keys / 审计链路交叉验证，不拆新的文档后台。',
        helper: '在同一套深色壳内查看 OpenAPI、核对最小权限 Key 与真实回调契约，再回到管理端处置风险信号。',
      }
    case 'supplier':
      return {
        badge: '供应商扩展 · API 契约',
        title: 'Docs Mission Control',
        description: '围绕供给链路、Webhook 回调与资源接口保持单一登录后控制台，不拆第二套供应商文档后台。',
        helper: '先核对 endpoint / scopes / 白名单，再回到供货、域名与结算工作台继续真实 API 联调。',
      }
    default:
      return {
        badge: '共享控制台 · API 契约',
        title: 'Docs Mission Control',
        description: '公开文档、API Keys、Webhook 联调与真实订单回放保持在同一套深色共享控制台里，不再跳到独立后台或外置说明页。',
        helper: '保持注册 → API Keys → Webhooks → Docs 的连续路径，再回到项目市场与订单中心验证真实业务链路。',
      }
  }
}

function actionCards(menu: Array<{ path: string }>, role?: string): DocsActionCard[] {
  const cards: DocsActionCard[] = [
    {
      key: 'projects',
      title: '项目市场基线',
      description: '先确认真实库存、价格与下单入口，再带着实际业务场景回来核对接口字段。',
      path: PROJECTS_ROUTE,
      button: '查看项目市场基线',
      icon: <IconServer />,
      accent: 'rgba(14, 165, 233, 0.24)',
    },
    {
      key: 'api-keys',
      title: '最小权限 API Key',
      description: '先创建最小 scopes 的 API Key，再对照 OpenAPI 查看请求头、白名单与限流约束。',
      path: API_KEYS_ROUTE,
      button: '打开 API Keys 工作台',
      icon: <IconSafe />,
      accent: 'rgba(94, 106, 210, 0.28)',
    },
    {
      key: 'webhooks',
      title: '真实回调验证',
      description: '阅读 payload 契约后回到 Webhook 页面做 test delivery，继续观察异步 delivery 状态。',
      path: WEBHOOKS_ROUTE,
      button: '打开 Webhook 设置',
      icon: <IconBolt />,
      accent: 'rgba(16, 185, 129, 0.24)',
    },
  ]

  return cards.filter((item) => {
    if (item.path === PROJECTS_ROUTE) {
      return true
    }
    if (item.path === API_KEYS_ROUTE) {
      return true
    }
    return menu.some((menuItem) => menuItem.path === item.path)
  })
}

const docsFlowSteps: DocsFlowStep[] = [
  {
    key: 'contract',
    title: '1. 统一接入路径',
    description: '先看 OpenAPI / Redoc，确认认证字段、状态码与 envelope 结构，再进入真实调用。',
  },
  {
    key: 'credentials',
    title: '2. 三段式联调节奏',
    description: '保持 API Keys → Webhooks → Docs 的顺序，减少“先写脚本再猜契约”的往返。',
  },
  {
    key: 'replay',
    title: '3. 真实 API 回放',
    description: '完成文档核对后回到项目、订单、Webhook 或管理员页面，用真实接口验证而不是停留在冒烟层。',
  },
]

function surfaceItems(menu: Array<{ path: string }>, role?: string) {
  const baseItems = [
    { label: 'OpenAPI 3 / Redoc', route: '/openapi/index.html', summary: '嵌入式 Redoc' },
    { label: 'API Keys', route: API_KEYS_ROUTE, summary: '最小权限 API Key' },
    { label: 'Webhook 设置', route: WEBHOOKS_ROUTE, summary: '真实回调验证' },
  ]

  const items = role === 'admin'
    ? [...baseItems, { label: '风险 / 审计回放', route: '/admin/risk + /admin/audit', summary: '高危事件复盘' }]
    : role === 'supplier'
      ? [...baseItems, { label: '资源 / 供货工作台', route: '/supplier/resources', summary: '供给链路联调' }]
      : [...baseItems, { label: '项目 / 订单回放', route: '/projects + /orders', summary: '真实业务验证' }]

  return items.filter((item) => item.route.includes(' + ') || item.route === '/openapi/index.html' || menu.some((menuItem) => menuItem.path === item.route))
}

export function ApiDocsPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()

  const canOpenProjects = hasMenuPath(menu, PROJECTS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenBalance = hasMenuPath(menu, BALANCE_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const copy = useMemo(() => roleCopy(user?.role), [user?.role])
  const cards = useMemo(() => actionCards(menu, user?.role), [menu, user?.role])
  const surfaces = useMemo(() => surfaceItems(menu, user?.role), [menu, user?.role])
  const bridgeCards = useMemo(
    () =>
      sharedConsoleBridgeCards.filter((card) => {
        switch (card.path) {
          case PROJECTS_ROUTE:
            return canOpenProjects
          case API_KEYS_ROUTE:
            return canOpenApiKeys
          case WEBHOOKS_ROUTE:
            return canOpenWebhooks
          case BALANCE_ROUTE:
            return canOpenBalance
          default:
            return false
        }
      }),
    [canOpenApiKeys, canOpenBalance, canOpenProjects, canOpenWebhooks],
  )

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">{copy.badge}</Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>{copy.title}</Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              {copy.description}
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconArticle />}>注册后连续路径</Tag>
            <Tag color="grey" prefixIcon={<IconSafe />}>统一接入路径</Tag>
            <Tag color="grey" prefixIcon={<IconActivity />}>真实 API 回放仍在同一控制台继续完成</Tag>
          </Space>
          <Typography.Text style={{ color: 'rgba(208,214,224,0.74)', fontSize: 13, lineHeight: 1.7 }}>{copy.helper}</Typography.Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card title="三段式联调节奏" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
            <Timeline mode="left" style={{ width: '100%' }}>
              {docsFlowSteps.map((step) => (
                <Timeline.Item key={step.key} time={step.title} type="ongoing">
                  <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.78)' }}>
                    {step.description}
                  </Typography.Paragraph>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title="控制台能力矩阵" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
            <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
              {surfaces.map((item) => (
                <Card
                  key={item.label}
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Space vertical align="start" spacing={6} style={{ width: '100%' }}>
                    <Typography.Text style={{ color: '#f7f8f8', fontWeight: 600 }}>{item.summary}</Typography.Text>
                    <Typography.Text style={{ color: 'rgba(208,214,224,0.74)' }}>{item.label}</Typography.Text>
                    <Tag color="grey">{item.route}</Tag>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.94) 56%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(125,211,252,0.16)',
        }}
        bodyStyle={{ padding: 22 }}
      >
        <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
          <div data-testid="docs-shared-console-bridge" style={{ width: '100%' }}>
            <Tag color="cyan" shape="circle">共享控制台桥接路径</Tag>
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between', marginTop: 14 }} wrap>
            <div>
              <Typography.Title heading={4} style={{ margin: '0 0 8px', color: '#f7f8f8' }}>
                文档 → 真实业务 → 接入回放
              </Typography.Title>
              <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.78)', maxWidth: 760 }}>
                文档页不只承载 Redoc；它还负责把项目市场、余额中心、API Keys 与 Webhook 的真实工作台重新串回单一登录后控制台。
              </Typography.Paragraph>
            </div>
            <Space wrap>
              {bridgeCards.length === 0 && fallbackRoute !== DOCS_ROUTE ? (
                <Button aria-label="返回推荐工作台" theme="solid" type="primary" icon={<IconArrowRight />} onClick={() => navigate(fallbackRoute)}>
                  返回推荐工作台
                </Button>
              ) : null}
            </Space>
          </Space>
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {bridgeCards.map((card) => (
              <Col xs={24} md={12} xl={6} key={card.key}>
                <Card
                  style={{
                    height: '100%',
                    borderRadius: 20,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: `1px solid ${card.accent}`,
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                    <Tag color="grey" prefixIcon={card.path === BALANCE_ROUTE ? <IconPriceTag /> : card.path === WEBHOOKS_ROUTE ? <IconBolt /> : card.path === API_KEYS_ROUTE ? <IconSafe /> : <IconServer />}>{card.tag}</Tag>
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>{card.title}</Typography.Title>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.76)', minHeight: 88 }}>
                      {card.description}
                    </Typography.Paragraph>
                    <Button theme="borderless" type="primary" icon={<IconArrowRight />} onClick={() => navigate(card.path)} aria-label={card.button}>
                      {card.button}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
          </div>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        {cards.map((card) => (
          <Col key={card.key} xs={24} md={12} xl={8}>
            <Card
              style={{
                height: '100%',
                borderRadius: 20,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                border: `1px solid ${card.accent}`,
              }}
              bodyStyle={{ padding: 18 }}
            >
              <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                <Tag color="grey" prefixIcon={card.icon}>{card.title}</Tag>
                <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.76)' }}>
                  {card.description}
                </Typography.Paragraph>
                <Button theme="solid" type="primary" icon={<IconArrowRight />} onClick={() => navigate(card.path)}>
                  {card.button}
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ width: '100%', padding: 0, overflow: 'hidden', borderRadius: 24 }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '20px 24px 0 24px' }}>
          <Typography.Title heading={4} style={{ color: '#f7f8f8', marginBottom: 8 }}>嵌入式 Redoc</Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.78)' }}>
            当前页面继续直接嵌入 `/openapi/index.html`，让文档浏览与共享控制台导航保持同一视觉壳与同一登录上下文。
          </Typography.Paragraph>
        </div>
        <iframe
          title="nexus-mail-api-docs"
          src="/openapi/index.html"
          style={{ width: '100%', minHeight: '80vh', border: 'none', background: '#08090a' }}
        />
      </Card>
    </Space>
  )
}
