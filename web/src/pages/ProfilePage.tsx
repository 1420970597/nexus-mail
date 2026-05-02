import { Banner, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { IconArticle, IconBolt, IconSafe, IconServer } from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  PROFILE_ROUTE,
  PROJECTS_ROUTE,
  SETTINGS_ROUTE,
  WEBHOOKS_ROUTE,
  hasMenuPath,
  resolvePreferredConsoleRoute,
} from '../utils/consoleNavigation'

interface FocusAction {
  label: string
  path: string
  buttonText: string
}

interface FocusItem {
  title: string
  description: string
}

interface CapabilityCard {
  key: string
  title: string
  description: string
  buttonText: string
  path: string
  visible: boolean
}

interface SharedConsoleReturnCard {
  title: string
  description: string
  buttonText: string
  path: string
}

function roleColor(role?: string) {
  switch (role) {
    case 'admin':
      return 'red'
    case 'supplier':
      return 'green'
    default:
      return 'blue'
  }
}

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'supplier':
      return '供应商'
    default:
      return '用户'
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const canOpenProjects = hasMenuPath(menu, PROJECTS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const canOpenSettings = hasMenuPath(menu, SETTINGS_ROUTE)
  const canOpenSupplierDomains = hasMenuPath(menu, '/supplier/domains')
  const canOpenAdminRisk = hasMenuPath(menu, '/admin/risk')

  const profileScene = useMemo(() => {
    switch (user?.role) {
      case 'admin': {
        const actionPath = canOpenAdminRisk ? '/admin/risk' : fallbackRoute
        return {
          title: '管理员运营焦点',
          summary: '集中关注风控、审计、供应商运营与价格策略，让高危动作在单一共享控制台内闭环。',
          action: { label: '进入风控中心', path: actionPath, buttonText: '前往风控中心' },
          focuses: [
            { title: '风控与审计联动', description: '结合风险规则、审计日志与 API Key 事件，快速确认异常访问、限流与白名单拦截。' },
            { title: '供应商经营摘要', description: '从共享壳直接进入供应商管理、待结算排行与争议处理，不再依赖独立后台切换。' },
          ],
        }
      }
      case 'supplier': {
        const actionPath = canOpenSupplierDomains ? '/supplier/domains' : fallbackRoute
        return {
          title: '供应商运营焦点',
          summary: '围绕域名池、资源供给、供货规则与结算报表组织日常动作，确保供货运营与财务视角一致。',
          action: { label: '进入域名管理', path: actionPath, buttonText: '前往域名管理' },
          focuses: [
            { title: '域名与资源健康', description: '维护域名池、邮箱账号与协议状态，确保库存、成功率和可售性同步更新。' },
            { title: '供货策略闭环', description: '从供货规则到结算报表形成闭环，及时调整售价、成功率与优先级。' },
          ],
        }
      }
      default: {
        const actionPath = canOpenProjects ? PROJECTS_ROUTE : fallbackRoute
        return {
          title: '用户接入焦点',
          summary: '在同一套控制台里完成项目采购、订单追踪、API Key 接入与回调观察，减少跨角色跳转。',
          action: { label: '进入项目市场', path: actionPath, buttonText: '前往项目市场' },
          focuses: [
            { title: '采购与订单串联', description: '从项目市场发起下单后，立即回到订单中心查看邮箱分配、提取结果与最终结算状态。' },
            { title: '集成准备', description: '通过 API Key、白名单与文档入口快速完成程序化接入，并对接真实回调能力。' },
          ],
        }
      }
    }
  }, [canOpenAdminRisk, canOpenProjects, canOpenSupplierDomains, fallbackRoute, user?.role])

  const capabilityCards = useMemo<CapabilityCard[]>(
    () => [
      {
        key: 'projects',
        title: '共享采购入口',
        description: '从账号页继续回到项目市场，保持从身份核对到真实采购的一条主路径。',
        buttonText: '打开项目市场',
        path: PROJECTS_ROUTE,
        visible: canOpenProjects,
      },
      {
        key: 'api-keys',
        title: 'API 接入控制面',
        description: '在同一控制台里继续完成 API Keys、白名单与最小权限发放，不拆出独立接入后台。',
        buttonText: '前往 API Keys',
        path: API_KEYS_ROUTE,
        visible: canOpenApiKeys,
      },
      {
        key: 'webhooks',
        title: '回调联调入口',
        description: '直接进入 Webhook 设置查看 endpoint、测试投递与失败重试状态。',
        buttonText: '打开 Webhook 设置',
        path: WEBHOOKS_ROUTE,
        visible: canOpenWebhooks,
      },
      {
        key: 'docs',
        title: 'API 文档入口',
        description: '通过共享导航进入 /docs，对照真实路由与接入契约继续联调。',
        buttonText: '打开 API 文档',
        path: DOCS_ROUTE,
        visible: canOpenDocs,
      },
    ],
    [canOpenApiKeys, canOpenDocs, canOpenProjects, canOpenWebhooks],
  )

  const visibleCapabilityCards = capabilityCards.filter((item) => item.visible)
  const sharedConsoleReturnCard = useMemo<SharedConsoleReturnCard | null>(() => {
    if (user?.role === 'user') {
      if (!canOpenProjects && fallbackRoute !== PROFILE_ROUTE) {
        return {
          title: '回到推荐工作台继续主链路',
          description: '当服务端暂未暴露项目市场时，普通用户仍可从账号中枢回到推荐工作台继续查看预算、订单或接入入口。',
          buttonText: '返回推荐工作台',
          path: fallbackRoute,
        }
      }
      return null
    }

    if (canOpenSettings) {
      return {
        title: '通过设置中心回到共享控制台',
        description: '角色扩展仍留在同一套深色控制台中；如果当前页只负责身份核对，可先回到设置中心再继续风控、供给或接入链路。',
        buttonText: '返回共享工作台',
        path: SETTINGS_ROUTE,
      }
    }

    if (fallbackRoute !== PROFILE_ROUTE) {
      return {
        title: '回到推荐工作台继续角色扩展链路',
        description: '当设置中心入口暂未暴露时，仍可返回当前角色的推荐工作台，继续同一控制台中的风控、供给或接入任务。',
        buttonText: '返回共享工作台',
        path: fallbackRoute,
      }
    }

    return null
  }, [canOpenProjects, canOpenSettings, fallbackRoute, user?.role])

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
          <Tag color="cyan" shape="circle">Profile Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>个人资料</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 820 }}>
                账号身份、会话边界与下一步操作都在同一套深色共享控制台内完成，不额外拆出角色后台。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">单一登录后控制台</Tag>
              <Tag color="green">角色差异菜单</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="个人资料页不再只是静态身份展示，而是连接采购、API 接入、Webhook、文档与角色扩展入口的共享账号中枢。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={10}>
          <Card
            style={{
              height: '100%',
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.92) 100%)',
              color: '#e2e8f0',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              <Tag color={roleColor(user?.role)}>{roleLabel(user?.role)}</Tag>
              <Typography.Title heading={4} style={{ color: '#f8fafc', margin: 0 }}>
                {user?.email ?? '未登录'}
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.78)', margin: 0 }}>
                {profileScene.summary}
              </Typography.Paragraph>
              <Descriptions
                align="left"
                data={[
                  { key: '角色标识', value: roleLabel(user?.role) },
                  { key: '账号状态', value: 'active' },
                  { key: '共享壳模式', value: 'single-console' },
                ]}
                style={{ width: '100%', color: '#e2e8f0' }}
              />
              <Button type="primary" theme="solid" onClick={() => navigate(profileScene.action.path)}>
                {profileScene.action.buttonText}
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title={profileScene.title} style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 24 }}>
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              {profileScene.focuses.map((item) => (
                <Card
                  key={item.title}
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.92) 100%)',
                    border: '1px solid rgba(148,163,184,0.16)',
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Typography.Title heading={5} style={{ marginTop: 0 }}>{item.title}</Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>{item.description}</Typography.Paragraph>
                </Card>
              ))}
              <Banner
                type="info"
                fullMode={false}
                description={`当前推荐动作：${profileScene.action.label}。保持单一登录后控制台，不额外拆分独立后台。`}
                style={{ width: '100%' }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card
            title={<span style={{ color: '#f8fafc' }}>控制台桥接能力</span>}
            style={{ width: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[16, 16]}>
              {visibleCapabilityCards.map((item) => (
                <Col xs={24} md={12} key={item.key}>
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
                      <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{item.title}</Typography.Title>
                      <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.72)', minHeight: 72 }}>
                        {item.description}
                      </Typography.Paragraph>
                      <Button type="primary" theme="solid" onClick={() => navigate(item.path)}>
                        {item.buttonText}
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
            title={<span style={{ color: '#f8fafc' }}>角色扩展说明</span>}
            style={{ height: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            bodyStyle={{ padding: 20 }}
          >
            <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
              <Tag color="grey" prefixIcon={<IconServer />}>{user?.role === 'admin' ? '管理员角色扩展' : user?.role === 'supplier' ? '供应商角色扩展' : '深色共享账号中枢'}</Tag>
              <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.78)' }}>
                {user?.role === 'admin'
                  ? '当前账号已被服务端授予管理员角色；高危运营、风控与审计动作继续在同一套共享控制台内完成。'
                  : user?.role === 'supplier'
                    ? '当前账号已被服务端授予供应商角色；供给链路仍然挂载在同一套共享控制台内，不切换独立后台。'
                    : '当前账号默认以用户身份进入共享控制台；如后续被服务端授予供应商或管理员角色，菜单会继续在同一壳内扩展。'}
              </Typography.Paragraph>
              <Space wrap>
                <Tag color="cyan" prefixIcon={<IconSafe />}>最小权限</Tag>
                <Tag color="blue" prefixIcon={<IconBolt />}>Webhook / API</Tag>
                <Tag color="green" prefixIcon={<IconArticle />}>单一文档入口</Tag>
              </Space>
              {sharedConsoleReturnCard ? (
                <Card
                  data-testid="profile-shared-console-return"
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(94,106,210,0.24)',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                    <Typography.Text strong style={{ color: '#f8fafc' }}>{sharedConsoleReturnCard.title}</Typography.Text>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.72)' }}>
                      {sharedConsoleReturnCard.description}
                    </Typography.Paragraph>
                    <Button theme="solid" type="primary" onClick={() => navigate(sharedConsoleReturnCard.path)}>
                      {sharedConsoleReturnCard.buttonText}
                    </Button>
                  </Space>
                </Card>
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
