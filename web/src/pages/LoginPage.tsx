import { Banner, Button, Card, Col, Divider, Form, Row, Space, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconArrowRight, IconLock, IconMail, IconSafe, IconUserGroup } from '@douyinfe/semi-icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/auth'
import { useAuthStore } from '../store/authStore'

type AuthMode = 'login' | 'register'

const modeCopy: Record<AuthMode, { title: string; button: string; helper: string }> = {
  login: {
    title: '登录并进入 Shared Console',
    button: '登录并进入统一控制台',
    helper: '使用统一控制台访问用户、供应商与管理员能力。',
  },
  register: {
    title: '创建账号并进入 Shared Console',
    button: '注册并进入统一控制台',
    helper: '仅需邮箱与密码即可开通账户；注册成功后直接进入同一套控制台。',
  },
}

const featureCards = [
  {
    icon: <IconSafe size="large" />,
    title: '统一权限控制台',
    description: '参考 new-api 的单一控制台结构，登录后通过角色菜单区分用户、供应商、管理员。',
  },
  {
    icon: <IconMail size="large" />,
    title: '真实业务链路',
    description: '项目市场、订单、API Key、Webhook、风控与审计均对接真实 API，而非占位壳页面。',
  },
  {
    icon: <IconUserGroup size="large" />,
    title: '共享布局与导航',
    description: '同一套侧边栏、顶栏与内容区骨架，避免冗余独立后台导致体验割裂。',
  },
]

const heroSignals = [
  {
    label: 'Single login',
    value: '注册 / 登录共用一套入口',
  },
  {
    label: 'Menu truth',
    value: '角色菜单由服务端权限返回驱动',
  },
  {
    label: 'Real APIs',
    value: 'API Keys / Webhooks / Docs 都走真实链路',
  },
]

const integrationRunway = [
  {
    title: 'Registration → API Keys',
    description: '注册成功后立即落到共享控制台，从同一壳里生成首个 API Key 并确认最小权限。',
  },
  {
    title: 'Webhook delivery rehearsal',
    description: '继续配置白名单与 Webhook endpoint，发起一次真实 test delivery 作为首次联调。',
  },
  {
    title: 'Docs + replay',
    description: '回到 API 文档核对请求契约，再用真实 API 回放验证集成链路。',
  },
]

const devAccounts = [
  'admin@nexus-mail.local / Admin123!',
  'supplier@nexus-mail.local / Supplier123!',
  'user@nexus-mail.local / User123!',
]

export function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const copy = useMemo(() => modeCopy[mode], [mode])

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
  }

  const onSubmit = async (values: { email: string; password: string; confirm_password?: string }) => {
    const email = String(values.email || '').trim()
    const password = String(values.password || '')
    const confirmPassword = String(values.confirm_password || '')

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    setError('')
    try {
      const session = mode === 'login' ? await login(email, password) : await register(email, password)
      setSession(session.token, session.refresh_token, session.user)
      Toast.success(mode === 'login' ? '登录成功，欢迎回来' : '注册成功，已自动进入控制台')
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? (mode === 'login' ? '登录失败' : '注册失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(67, 104, 255, 0.22), transparent 28%), radial-gradient(circle at right top, rgba(19, 194, 194, 0.18), transparent 22%), linear-gradient(135deg, #061329 0%, #0f172a 45%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1180 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} lg={14}>
            <Space vertical spacing={20} align="start" style={{ color: '#e2e8f0', width: '100%' }}>
              <Tagline />
              <div>
                <Typography.Title heading={1} style={{ color: '#f8fafc', marginBottom: 12, fontSize: 48, lineHeight: 1.12 }}>
                  邮件接码业务的统一运营控制台
                </Typography.Title>
                <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.82)', fontSize: 18, maxWidth: 640, marginBottom: 0 }}>
                  以单一登录入口承载注册、采购、供货、风控与审计能力，保持与 new-api 类似的共享壳体验，减少角色切换成本。
                </Typography.Paragraph>
              </div>
              <Card
                data-testid="login-hero-signal-grid"
                bodyStyle={{ padding: 18 }}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'rgba(0,0,0,0.22) 0px 18px 44px',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <Row gutter={[12, 12]} style={{ width: '100%' }}>
                  {heroSignals.map((item) => (
                    <Col xs={24} md={8} key={item.label}>
                      <div
                        style={{
                          minHeight: 92,
                          borderRadius: 16,
                          padding: '14px 16px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <Typography.Text
                          style={{
                            display: 'block',
                            color: 'rgba(138,143,152,0.96)',
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {item.label}
                        </Typography.Text>
                        <Typography.Text
                          style={{
                            display: 'block',
                            color: '#f7f8f8',
                            fontSize: 15,
                            fontWeight: 600,
                            lineHeight: 1.7,
                            marginTop: 10,
                          }}
                        >
                          {item.value}
                        </Typography.Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
              <Row gutter={[16, 16]} style={{ width: '100%' }}>
                {featureCards.map((item) => (
                  <Col xs={24} md={12} xl={8} key={item.title}>
                    <Card
                      bodyStyle={{ padding: 20 }}
                      style={{
                        height: '100%',
                        background: 'rgba(15, 23, 42, 0.66)',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        boxShadow: '0 18px 44px rgba(2, 6, 23, 0.24)',
                        backdropFilter: 'blur(14px)',
                      }}
                    >
                      <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                        <div style={{ color: '#7dd3fc' }}>{item.icon}</div>
                        <Typography.Title heading={5} style={{ color: '#f8fafc', margin: 0 }}>
                          {item.title}
                        </Typography.Title>
                        <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.72)', margin: 0 }}>
                          {item.description}
                        </Typography.Paragraph>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Card
                data-testid="login-register-journey"
                bodyStyle={{ padding: 20 }}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.66)',
                  border: '1px solid rgba(96, 165, 250, 0.24)',
                  boxShadow: '0 18px 44px rgba(2, 6, 23, 0.24)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={4} style={{ color: '#f8fafc', marginBottom: 8 }}>
                      注册后进入同一套控制台
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.78)', margin: 0 }}>
                      保持单一深色共享壳：先完成账户创建，再沿着 API Keys、Webhook 与 Docs 的统一接入跑道完成首轮联调。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[12, 12]} style={{ width: '100%' }}>
                    {integrationRunway.map((item) => (
                      <Col xs={24} md={8} key={item.title}>
                        <Card
                          bodyStyle={{ padding: 16 }}
                          style={{
                            height: '100%',
                            background: 'rgba(2, 6, 23, 0.28)',
                            border: '1px solid rgba(148, 163, 184, 0.16)',
                          }}
                        >
                          <Typography.Title heading={6} style={{ color: '#f8fafc', marginBottom: 8 }}>
                            {item.title}
                          </Typography.Title>
                          <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.7)', margin: 0 }}>
                            {item.description}
                          </Typography.Paragraph>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Button
                    theme="solid"
                    type="primary"
                    icon={<IconArrowRight />}
                    onClick={() => switchMode('register')}
                  >
                    立即注册，进入共享控制台
                  </Button>
                </Space>
              </Card>

              {import.meta.env.DEV ? (
                <Banner
                  type="info"
                  fullMode={false}
                  closeIcon={null}
                  title="开发环境快捷账号"
                  description={devAccounts.join(' ｜ ')}
                  style={{
                    width: '100%',
                    background: 'rgba(12, 74, 110, 0.45)',
                    border: '1px solid rgba(125, 211, 252, 0.28)',
                    color: '#e0f2fe',
                  }}
                />
              ) : null}
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              data-testid="login-auth-shell"
              bodyStyle={{ padding: 28 }}
              style={{
                width: '100%',
                borderRadius: 24,
                background: 'linear-gradient(180deg, rgba(15,16,17,0.96) 0%, rgba(25,26,27,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'rgba(0,0,0,0.38) 0px 24px 64px',
                backdropFilter: 'blur(18px)',
              }}
            >
              <Space vertical spacing={18} align="start" style={{ width: '100%' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Title heading={3} style={{ marginBottom: 8 }}>
                      {copy.title}
                    </Typography.Title>
                    <Typography.Paragraph style={{ margin: 0, color: '#475569' }}>{copy.helper}</Typography.Paragraph>
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      color: '#fff',
                      boxShadow: '0 14px 30px rgba(59,130,246,0.28)',
                    }}
                  >
                    <IconLock size="large" />
                  </div>
                </Space>

                <div
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                    padding: 6,
                    borderRadius: 18,
                    background: '#eef2ff',
                  }}
                >
                  <Button theme={mode === 'login' ? 'solid' : 'borderless'} type={mode === 'login' ? 'primary' : 'tertiary'} onClick={() => switchMode('login')}>
                    登录
                  </Button>
                  <Button theme={mode === 'register' ? 'solid' : 'borderless'} type={mode === 'register' ? 'primary' : 'tertiary'} onClick={() => switchMode('register')}>
                    注册
                  </Button>
                </div>

                {mode === 'login' ? (
                  <Banner
                    type="info"
                    fullMode={false}
                    description="已有账号可直接进入共享控制台；若首次使用，可先注册并在同一壳内按角色扩展工作台。"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Banner
                    type="success"
                    fullMode={false}
                    description="注册成功后不会跳转到独立新手页，而是直接进入与登录一致的控制台布局，并先按“项目市场 → 订单中心 → API 接入”完成首轮引导。"
                    style={{ width: '100%' }}
                  />
                )}

                <Form onSubmit={onSubmit} labelPosition="top" style={{ width: '100%' }}>
                  <Form.Input
                    field="email"
                    label="邮箱"
                    placeholder="name@example.com"
                    rules={[{ required: true, message: '请输入邮箱' }]}
                  />
                  <Form.Input
                    field="password"
                    label="密码"
                    mode="password"
                    placeholder={mode === 'login' ? '请输入密码' : '至少 8 位密码'}
                    rules={[{ required: true, message: '请输入密码' }]}
                  />
                  {mode === 'register' ? (
                    <Form.Input
                      field="confirm_password"
                      label="确认密码"
                      mode="password"
                      placeholder="再次输入密码"
                      rules={[{ required: true, message: '请再次输入密码' }]}
                    />
                  ) : null}
                  {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
                  <Button htmlType="submit" theme="solid" type="primary" loading={loading} style={{ marginTop: 12, width: '100%', height: 44 }}>
                    {copy.button}
                  </Button>
                </Form>

                <Divider margin="12px" />
                <Typography.Text type="tertiary">
                  登录后进入同一套控制台布局；菜单与页面能力由角色控制，而不是拆分多个独立后台。
                </Typography.Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

function Tagline() {
  return (
    <Tag
      data-testid="login-shared-console-tag"
      color="cyan"
      size="large"
      shape="circle"
      style={{
        background: 'rgba(15, 23, 42, 0.42)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        color: '#bfdbfe',
      }}
    >
      Nexus-Mail · Shared Console
    </Tag>
  )
}
