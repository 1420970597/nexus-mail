import { Banner, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconArticle,
  IconBolt,
  IconSafe,
  IconServer,
  IconSetting,
  IconUser,
} from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ShortcutCard {
  title: string
  description: string
  button: string
  path: string
  tag: string
  accent: string
  icon: JSX.Element
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

function shortcutCardStyle(accent: string) {
  return {
    height: '100%',
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
  }
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const shortcuts = useMemo<ShortcutCard[]>(() => {
    const common: ShortcutCard[] = [
      {
        title: '个人资料与身份核对',
        description: '返回个人资料页确认当前角色、账号邮箱与推荐操作路径，避免角色误判导致跨区访问。',
        button: '查看个人资料',
        path: '/profile',
        tag: '基础入口',
        accent: 'rgba(94,106,210,0.2)',
        icon: <IconUser />,
      },
      {
        title: 'API 接入入口',
        description: '快速跳转 API Keys 完成 token、白名单与回调前置准备，再从顶栏与侧边栏进入 API 文档。',
        button: '管理 API Keys',
        path: '/api-keys',
        tag: '集成入口',
        accent: 'rgba(16,185,129,0.18)',
        icon: <IconArticle />,
      },
      {
        title: 'Webhook 回调工作台',
        description: '在共享控制台中直接维护 endpoint、测试投递与 delivery 状态，保持与 API Keys、文档同层级联动。',
        button: '打开 Webhook 设置',
        path: '/webhooks',
        tag: '共享入口',
        accent: 'rgba(14,165,233,0.18)',
        icon: <IconBolt />,
      },
    ]

    switch (user?.role) {
      case 'admin':
        return [
          {
            title: '风险规则联动',
            description: '进入风控中心查看高风险信号、规则阈值与运行时效果，确认限流、白名单与告警链路一致。',
            button: '前往风控中心',
            path: '/admin/risk',
            tag: '管理员',
            accent: 'rgba(239,68,68,0.16)',
            icon: <IconSafe />,
          },
          {
            title: '审计追踪',
            description: '查看 API Key 生命周期、结算、调账与争议处理审计，保证高危动作可追踪可回放。',
            button: '查看审计日志',
            path: '/admin/audit',
            tag: '管理员',
            accent: 'rgba(249,115,22,0.18)',
            icon: <IconBolt />,
          },
          {
            title: 'Webhook 观测',
            description: '通过管理员共享入口查看回调 endpoint、投递记录与失败重试状态，避免跨后台切换。',
            button: '打开 Webhook 设置',
            path: '/webhooks',
            tag: '管理员',
            accent: 'rgba(14,165,233,0.18)',
            icon: <IconServer />,
          },
          ...common,
        ]
      case 'supplier':
        return [
          {
            title: '资源供给维护',
            description: '进入供应商资源页维护邮箱账号、协议配置与健康状态，确保供给链路稳定。',
            button: '查看供应商资源',
            path: '/supplier/resources',
            tag: '供应商',
            accent: 'rgba(16,185,129,0.18)',
            icon: <IconServer />,
          },
          {
            title: '供货与结算闭环',
            description: '从供货规则到供应商结算页形成闭环，及时修正售价、成功率与回款观察。',
            button: '前往供应商结算',
            path: '/supplier/settlements',
            tag: '供应商',
            accent: 'rgba(94,106,210,0.18)',
            icon: <IconSetting />,
          },
          ...common,
        ]
      default:
        return [
          {
            title: '项目采购入口',
            description: '从项目市场继续采购资源，并在订单中心与余额中心查看后续执行结果。',
            button: '前往项目市场',
            path: '/projects',
            tag: '用户',
            accent: 'rgba(14,165,233,0.18)',
            icon: <IconServer />,
          },
          {
            title: '订单与回调观察',
            description: '通过订单中心观察邮箱分配、提取结果和完成状态，再结合 API 文档完成系统集成。',
            button: '查看订单中心',
            path: '/orders',
            tag: '用户',
            accent: 'rgba(94,106,210,0.18)',
            icon: <IconBolt />,
          },
          ...common,
        ]
    }
  }, [user?.role])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.14) 0%, rgba(255,255,255,0.98) 58%)',
          border: '1px solid rgba(148,163,184,0.16)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Console Shortcuts</Tag>
          <div>
            <Typography.Title heading={3}>设置中心</Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: '#475569', maxWidth: 820 }}>
              把设置页收敛成真实可执行的控制台捷径与会话说明，而不是展示无后端契约支撑的规划性表单；继续保持 single-console 体验。
            </Typography.Paragraph>
          </div>
          <Banner
            type="info"
            fullMode={false}
            description="这里聚焦当前已交付的真实入口：会话轮换、角色壳切换、API 文档、风控/审计/Webhook/供货运营，不展示会误导用户的伪设置项。"
            style={{ width: '100%' }}
          />
        </Space>
      </Card>

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
