import { Banner, Button, Card, Col, Divider, Form, Row, Space, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconArrowRight, IconLock } from '@douyinfe/semi-icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/auth'
import { useAuthStore } from '../store/authStore'

type AuthMode = 'login' | 'register'

const modeCopy: Record<AuthMode, { title: string; button: string; helper: string }> = {
  login: {
    title: '登录并进入统一控制台',
    button: '登录并进入统一控制台',
    helper: '使用统一控制台访问用户、供应商与管理员能力。',
  },
  register: {
    title: '创建账号并进入统一控制台',
    button: '注册并进入统一控制台',
    helper: '仅需邮箱与密码即可开通账户；注册成功后直接进入同一套控制台。',
  },
}

const readinessRows = [
  {
    label: '注册 / 登录',
    value: '同一入口',
    detail: '保留统一认证入口，不拆成独立注册站或多后台登录页。',
  },
  {
    label: '角色菜单',
    value: '服务端角色真值',
    detail: '登录后仍是同一壳，只按 user / supplier / admin 返回不同菜单。',
  },
  {
    label: '控制台首页',
    value: 'Dashboard 已就绪',
    detail: '会话建立后直接落到共享 shell，而不是额外营销欢迎页。',
  },
  {
    label: 'API 接入',
    value: 'Keys / Webhooks / Docs',
    detail: '真实接入路径已经在同一套控制台导航中可见。',
  },
]

const roleWorkspaceCards = [
  {
    title: '用户工作区',
    summary: '项目市场 / 订单中心 / API Keys',
    detail: '从下单、订单处理到 API 接入都停留在统一共享壳内。',
  },
  {
    title: '供应商工作区',
    summary: '资源域名 / 供货规则 / 结算视图',
    detail: '同一 shell 下切到资源供给与运营结算页面，不切换独立系统。',
  },
  {
    title: '管理员工作区',
    summary: '总览 / 风控中心 / 审计日志',
    detail: '保留平台级运营与审计入口，但仍复用统一导航与认证会话。',
  },
]

const integrationRunway = [
  {
    title: '注册后配置 API Keys',
    description: '注册成功后立即落到共享控制台，从同一壳里生成首个 API Key 并确认最小权限。',
  },
  {
    title: 'Webhook 回调联调',
    description: '继续配置白名单与 Webhook endpoint，发起一次真实 test delivery 作为首次联调。',
  },
  {
    title: '文档回放校验',
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
                <Typography.Title heading={1} style={{ color: '#f7f8f8', marginBottom: 10, fontSize: 44, lineHeight: 1.04, letterSpacing: '-1.02px', maxWidth: 620 }}>
                  统一登录后控制台
                </Typography.Title>
                <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.78)', fontSize: 16, lineHeight: 1.72, maxWidth: 600, marginBottom: 0 }}>
                  共享认证入口、共享控制台壳、共享 API 接入路径；角色差异只体现在登录后的菜单与页面能力。
                </Typography.Paragraph>
              </div>
              <Card
                data-testid="login-control-plane-readiness"
                bodyStyle={{ padding: 16 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'rgba(0,0,0,0.22) 0px 14px 36px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical spacing={14} align="start" style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={5} style={{ color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.18px' }}>
                      真实控制台合同
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.66)', margin: 0, lineHeight: 1.68, fontSize: 13 }}>
                      只展示当前登录页能够稳定承诺的入口、会话与接入能力，不再使用泛化营销卖点。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[12, 12]} style={{ width: '100%' }}>
                    {readinessRows.map((item) => (
                      <Col xs={24} md={12} key={item.label}>
                        <div
                          style={{
                            minHeight: 108,
                            borderRadius: 14,
                            padding: '13px 14px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <Typography.Text
                            style={{
                              display: 'block',
                              color: 'rgba(138,143,152,0.96)',
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.09em',
                            }}
                          >
                            {item.label}
                          </Typography.Text>
                          <Typography.Text
                            style={{
                              display: 'block',
                              color: '#f7f8f8',
                              fontSize: 14,
                              fontWeight: 600,
                              lineHeight: 1.55,
                              marginTop: 8,
                            }}
                          >
                            {item.value}
                          </Typography.Text>
                          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: '8px 0 0', fontSize: 12, lineHeight: 1.62 }}>
                            {item.detail}
                          </Typography.Paragraph>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Space>
              </Card>
              <Card
                data-testid="login-role-workspaces"
                bodyStyle={{ padding: 18 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 14px 34px rgba(2, 6, 23, 0.22)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={4} style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.22px' }}>
                      同一壳内角色工作区
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.7)', margin: 0, maxWidth: 620, lineHeight: 1.72 }}>
                      登录后进入同一套深色 shell，再根据角色菜单切换视图，不拆分前台、供应商站和管理后台入口。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[16, 16]} style={{ width: '100%' }}>
                    {roleWorkspaceCards.map((item) => (
                      <Col xs={24} md={12} xl={8} key={item.title}>
                        <Card
                          bodyStyle={{ padding: 18 }}
                          style={{
                            height: '100%',
                            background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 14px 34px rgba(2, 6, 23, 0.22)',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                            <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0, letterSpacing: '-0.18px' }}>
                              {item.title}
                            </Typography.Title>
                            <Typography.Text style={{ color: '#7170ff', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                              {item.summary}
                            </Typography.Text>
                            <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.68)', margin: 0, lineHeight: 1.7, fontSize: 14 }}>
                              {item.detail}
                            </Typography.Paragraph>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Space>
              </Card>

              <Card
                data-testid="login-register-journey"
                bodyStyle={{ padding: 18 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 14px 34px rgba(2, 6, 23, 0.22)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={4} style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.22px' }}>
                      注册后进入同一套控制台
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.7)', margin: 0, maxWidth: 620, lineHeight: 1.72 }}>
                      保持单一深色共享壳：先创建账户，再在同一导航骨架里完成 API Keys、Webhook 与 Docs 的首轮接入联调。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[12, 12]} style={{ width: '100%' }}>
                    {integrationRunway.map((item) => (
                      <Col xs={24} md={8} key={item.title}>
                        <Card
                          bodyStyle={{ padding: 14 }}
                          style={{
                            height: '100%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.14px' }}>
                            {item.title}
                          </Typography.Title>
                          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.66)', margin: 0, fontSize: 13, lineHeight: 1.68 }}>
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
                    style={{
                      borderRadius: 12,
                      background: '#5e6ad2',
                      border: '1px solid rgba(130, 143, 255, 0.92)',
                      boxShadow: '0 12px 28px rgba(94,106,210,0.24)',
                    }}
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
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#d0d6e0',
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
                    <Typography.Text
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                        color: 'rgba(138,143,152,0.94)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.09em',
                      }}
                    >
                      统一控制台登录
                    </Typography.Text>
                    <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8', letterSpacing: '-0.24px' }}>
                      {copy.title}
                    </Typography.Title>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.82)', lineHeight: 1.65 }}>
                      {copy.helper}
                    </Typography.Paragraph>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(94,106,210,0.92) 0%, rgba(113,112,255,0.88) 100%)',
                      color: '#fff',
                      boxShadow: '0 12px 28px rgba(94,106,210,0.24)',
                    }}
                  >
                    <IconLock size="large" />
                  </div>
                </Space>

                <div
                  data-testid="login-auth-mode-switch"
                  role="tablist"
                  aria-label="认证模式切换"
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 10,
                    padding: 6,
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'rgba(0,0,0,0.22) 0px 0px 0px 1px inset',
                  }}
                >
                  <Button
                    role="tab"
                    aria-selected={mode === 'login'}
                    theme={mode === 'login' ? 'solid' : 'borderless'}
                    type={mode === 'login' ? 'primary' : 'tertiary'}
                    style={
                      mode === 'login'
                        ? {
                            borderRadius: 12,
                            background: '#5e6ad2',
                            border: '1px solid rgba(130, 143, 255, 0.9)',
                            boxShadow: '0 10px 24px rgba(94,106,210,0.28)',
                          }
                        : {
                            borderRadius: 12,
                            color: '#d0d6e0',
                          }
                    }
                    onClick={() => switchMode('login')}
                  >
                    登录
                  </Button>
                  <Button
                    role="tab"
                    aria-selected={mode === 'register'}
                    theme={mode === 'register' ? 'solid' : 'borderless'}
                    type={mode === 'register' ? 'primary' : 'tertiary'}
                    style={
                      mode === 'register'
                        ? {
                            borderRadius: 12,
                            background: '#5e6ad2',
                            border: '1px solid rgba(130, 143, 255, 0.9)',
                            boxShadow: '0 10px 24px rgba(94,106,210,0.28)',
                          }
                        : {
                            borderRadius: 12,
                            color: '#d0d6e0',
                          }
                    }
                    onClick={() => switchMode('register')}
                  >
                    注册
                  </Button>
                </div>

                {mode === 'login' ? (
                  <Banner
                    data-testid="login-auth-guidance-banner"
                    type="info"
                    fullMode={false}
                    closeIcon={null}
                    description="已有账号可直接进入共享控制台；若首次使用，可先注册，并在同一壳里按角色扩展工作区。"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.028)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#d0d6e0',
                    }}
                  />
                ) : (
                  <Banner
                    data-testid="login-auth-guidance-banner"
                    type="success"
                    fullMode={false}
                    closeIcon={null}
                    description="注册成功后不会跳转到独立新手页，而是直接进入与登录一致的控制台布局，并先按“项目市场 → 订单中心 → API Keys”完成首轮引导。"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.028)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#d0d6e0',
                    }}
                  />
                )}

                <Form onSubmit={onSubmit} labelPosition="top" style={{ width: '100%' }}>
                  <Form.Input
                    field="email"
                    label="邮箱"
                    placeholder="name@example.com"
                    rules={[{ required: true, message: '请输入邮箱' }]}
                    fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)', color: '#f7f8f8' }}
                  />
                  <Form.Input
                    field="password"
                    label="密码"
                    mode="password"
                    placeholder={mode === 'login' ? '请输入密码' : '至少 8 位密码'}
                    rules={[{ required: true, message: '请输入密码' }]}
                    fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)', color: '#f7f8f8' }}
                  />
                  {mode === 'register' ? (
                    <Form.Input
                      field="confirm_password"
                      label="确认密码"
                      mode="password"
                      placeholder="再次输入密码"
                      rules={[{ required: true, message: '请再次输入密码' }]}
                      fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)', color: '#f7f8f8' }}
                    />
                  ) : null}
                  {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
                  <Button htmlType="submit" theme="solid" type="primary" loading={loading} style={{ marginTop: 12, width: '100%', height: 44, borderRadius: 12, background: '#5e6ad2', border: '1px solid rgba(130, 143, 255, 0.92)', boxShadow: '0 12px 28px rgba(94,106,210,0.24)' }}>
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
      Nexus-Mail · 统一控制台
    </Tag>
  )
}
