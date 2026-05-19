import { Banner, Button, Card, Col, Divider, Form, Row, Space, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconArrowRight, IconLock } from '@douyinfe/semi-icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

type AuthMode = 'login' | 'register'

const modeCopy: Record<AuthMode, { title: string; button: string; helper: string }> = {
  login: {
    title: '登录并进入统一控制台',
    button: '登录并进入统一控制台',
    helper: '登录后按角色展开工作区，继续同一套导航。',
  },
  register: {
    title: '创建账号并进入统一控制台',
    button: '注册并进入统一控制台',
    helper: '注册后直接进入共享控制台，你可以继续前往项目市场、订单中心与 API Keys。',
  },
}

const readinessRows = [
  {
    label: '统一入口',
    value: '登录 / 注册同入口',
    detail: '不拆独立注册站或额外后台登录页。',
  },
  {
    label: '共享控制台',
    value: '登录后进入同一壳',
    detail: '角色差异留在控制台内按菜单与页面能力展开。',
  },
  {
    label: '开发接入',
    value: 'Keys · Webhooks · Docs',
    detail: '接入链路保留在同一套控制台导航中。',
  },
]

const integrationRunway = [
  {
    key: 'api-keys',
    step: 'STEP 01',
    title: 'API Keys 起步',
    eyebrow: '最小权限起步',
    description: '生成首个最小权限密钥。',
    cta: '先配置 API Keys',
    target: API_KEYS_ROUTE,
  },
  {
    key: 'webhooks',
    step: 'STEP 02',
    title: 'Webhook 联调',
    eyebrow: '真实回调验证',
    description: '确认回调地址并发起真实联调。',
    cta: '继续联调 Webhook',
    target: WEBHOOKS_ROUTE,
  },
  {
    key: 'docs',
    step: 'STEP 03',
    title: '文档核对',
    eyebrow: '契约核对',
    description: '查看 API 文档并核对请求契约。',
    cta: '查看 API 文档',
    target: DOCS_ROUTE,
  },
]

const roleWorkspaceRows = [
  {
    key: 'shared',
    title: '共享路由常驻同一壳',
    routes: '项目市场 · 订单中心 · API Keys',
    detail: '基础采购、履约追踪与程序化接入保持在同一套登录后控制台里。',
    accent: 'rgba(14, 165, 233, 0.22)',
  },
  {
    key: 'expanded',
    title: '额外工作区按服务端角色展开',
    routes: '域名池 · 资源 · 供货规则 · 结算',
    detail: '只有在服务端授予对应角色后，相关菜单才会继续出现在同一壳内。',
    accent: 'rgba(16, 185, 129, 0.22)',
  },
  {
    key: 'ops',
    title: '运营治理仍留在共享控制台',
    routes: '风控中心 · 审计日志 · 运营协同',
    detail: '风险治理、审计复核与供给协同继续复用单一登录后的控制台骨架。',
    accent: 'rgba(94,106,210,0.24)',
  },
]

const capabilityMatrixRows = [
  {
    key: 'identity',
    title: '统一登录入口',
    detail: '登录 / 注册同入口，避免拆出第二套身份站。',
    accent: 'rgba(56, 189, 248, 0.18)',
  },
  {
    key: 'bridge',
    title: '共享接入桥接',
    detail: 'API Keys、Webhook 与文档核对继续留在同一控制台导航里。',
    accent: 'rgba(96, 165, 250, 0.18)',
  },
  {
    key: 'roles',
    title: '服务端菜单扩展',
    detail: '供应商 / 管理员工作区只在授权后于同一壳内展开。',
    accent: 'rgba(34, 197, 94, 0.18)',
  },
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

    if (mode === 'register' && !email.includes('@')) {
      setError('请输入有效邮箱')
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError('密码长度至少为 8 位')
      return
    }

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
              <div data-testid="login-entry-summary">
                <Typography.Title heading={1} style={{ color: '#f7f8f8', marginBottom: 10, fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.96px', maxWidth: 560 }}>
                  统一登录后控制台
                </Typography.Title>
                <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.72)', fontSize: 15, lineHeight: 1.62, maxWidth: 500, marginBottom: 0 }}>
                  统一入口、共享控制台与接入路径，在同一登录面完成切换。
                </Typography.Paragraph>
              </div>
              <Card
                data-testid="login-control-plane-readiness"
                role="region"
                aria-labelledby="login-control-plane-readiness-heading"
                bodyStyle={{ padding: 16 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'rgba(0,0,0,0.22) 0px 14px 36px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical spacing={12} align="start" style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={5} id="login-control-plane-readiness-heading" style={{ color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.18px' }}>
                      控制台入口信号
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: 0, lineHeight: 1.6, fontSize: 13 }}>
                      先确认统一入口、共享壳与接入落点，再进入登录或注册。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[10, 10]} style={{ width: '100%' }}>
                    {readinessRows.map((item) => (
                      <Col xs={24} key={item.label}>
                        <div
                          data-testid="login-readiness-item"
                          style={{
                            minHeight: 0,
                            borderRadius: 14,
                            padding: '12px 14px',
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
                              lineHeight: 1.5,
                              marginTop: 8,
                            }}
                          >
                            {item.value}
                          </Typography.Text>
                          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.6)', margin: '7px 0 0', fontSize: 12, lineHeight: 1.58 }}>
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
                role="region"
                aria-labelledby="login-role-workspaces-heading"
                bodyStyle={{ padding: 16 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'rgba(0,0,0,0.22) 0px 14px 36px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical spacing={12} align="start" style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={5} id="login-role-workspaces-heading" style={{ color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.18px' }}>
                      角色工作区如何在同一壳内展开
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: 0, lineHeight: 1.6, fontSize: 13 }}>
                      先用同一入口登录；额外工作区只会在服务端授予对应角色后出现在同一套控制台菜单里。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[10, 10]} style={{ width: '100%' }}>
                    {roleWorkspaceRows.map((item) => (
                      <Col xs={24} key={item.key}>
                        <div
                          data-testid="login-role-workspace-card"
                          style={{
                            minHeight: 0,
                            borderRadius: 14,
                            padding: '12px 14px',
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${item.accent}`,
                            boxShadow: 'rgba(0,0,0,0.18) 0px 0px 0px 1px inset',
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
                            {item.title}
                          </Typography.Text>
                          <Typography.Text
                            style={{
                              display: 'block',
                              color: '#f7f8f8',
                              fontSize: 14,
                              fontWeight: 600,
                              lineHeight: 1.5,
                              marginTop: 8,
                            }}
                          >
                            {item.routes}
                          </Typography.Text>
                          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.6)', margin: '7px 0 0', fontSize: 12, lineHeight: 1.58 }}>
                            {item.detail}
                          </Typography.Paragraph>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Space>
              </Card>
              <Card
                data-testid="login-capability-matrix"
                role="region"
                aria-labelledby="login-capability-matrix-heading"
                bodyStyle={{ padding: 16 }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, rgba(15,16,17,0.9) 0%, rgba(19,20,24,0.94) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'rgba(0,0,0,0.22) 0px 14px 36px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Space vertical spacing={12} align="start" style={{ width: '100%' }}>
                  <div>
                    <Typography.Title heading={5} id="login-capability-matrix-heading" style={{ color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.18px' }}>
                      控制台能力矩阵
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: 0, lineHeight: 1.6, fontSize: 13 }}>
                      统一入口、接入桥接与角色扩展都留在同一登录后控制台中表达。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[10, 10]} style={{ width: '100%' }}>
                    {capabilityMatrixRows.map((item) => (
                      <Col xs={24} md={8} key={item.key}>
                        <div
                          data-testid="login-capability-matrix-item"
                          style={{
                            minHeight: '100%',
                            borderRadius: 14,
                            padding: '12px 14px',
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${item.accent}`,
                            boxShadow: 'rgba(0,0,0,0.18) 0px 0px 0px 1px inset',
                          }}
                        >
                          <Typography.Text
                            style={{
                              display: 'block',
                              color: '#f7f8f8',
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.title}
                          </Typography.Text>
                          <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: '7px 0 0', fontSize: 12, lineHeight: 1.58 }}>
                            {item.detail}
                          </Typography.Paragraph>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Space>
              </Card>
              <Card
                data-testid="login-register-journey"
                role="region"
                aria-labelledby="login-register-journey-heading"
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
                  <div data-testid="login-register-journey-summary">
                    <Typography.Title heading={4} id="login-register-journey-heading" style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.22px' }}>
                      首轮接入路径
                    </Typography.Title>
                    <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: 0, maxWidth: 460, lineHeight: 1.6, fontSize: 13 }}>
                      注册后进入共享控制台，再按当前菜单继续选择首轮接入动作。
                    </Typography.Paragraph>
                  </div>
                  <Row gutter={[12, 12]} style={{ width: '100%' }}>
                    {integrationRunway.map((item) => (
                      <Col xs={24} md={8} key={item.title}>
                        <Card
                          data-testid={`login-runway-card-${item.key}`}
                          bodyStyle={{ padding: 14 }}
                          style={{
                            height: '100%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: 'rgba(0,0,0,0.18) 0px 0px 0px 1px inset',
                          }}
                        >
                          <Space vertical spacing={6} align="start" style={{ width: '100%' }}>
                            <Typography.Text
                              style={{
                                color: 'rgba(138,143,152,0.92)',
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.step}
                            </Typography.Text>
                            <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 0, letterSpacing: '-0.14px' }}>
                              {item.title}
                            </Typography.Title>
                            <Typography.Text style={{ color: '#d0d6e0', fontSize: 12, fontWeight: 600, letterSpacing: '-0.08px' }}>
                              {item.eyebrow}
                            </Typography.Text>
                            <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.62)', margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                              {item.description}
                            </Typography.Paragraph>
                            <Button
                              theme="borderless"
                              type="tertiary"
                              icon={<IconArrowRight />}
                              onClick={() => navigate(item.target)}
                              style={{
                                marginTop: 4,
                                padding: 0,
                                color: '#c7d2fe',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {item.cta}
                            </Button>
                          </Space>
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
              <Space vertical spacing={16} align="start" style={{ width: '100%' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div
                    data-testid="login-auth-copy-block"
                    role="region"
                    aria-label={mode === 'login' ? '登录认证说明' : '注册认证说明'}
                  >
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
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.88)', lineHeight: 1.58, maxWidth: 380 }}>
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

                <style>{`
                  .login-auth-form-surface .semi-form-field-label,
                  .login-auth-form-surface .semi-form-field-label-text,
                  .login-auth-form-surface .semi-form-field-label-required {
                    color: #f7f8f8 !important;
                  }

                  .login-auth-form-surface .semi-input,
                  .login-auth-form-surface .semi-input-wrapper,
                  .login-auth-form-surface .semi-input-wrapper input {
                    color: #f7f8f8 !important;
                  }

                  .login-auth-form-surface .semi-input-wrapper {
                    background: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(255, 255, 255, 0.14) !important;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
                  }

                  .login-auth-form-surface .semi-input-wrapper:hover,
                  .login-auth-form-surface .semi-input-wrapper:focus-within {
                    border-color: rgba(130, 143, 255, 0.52) !important;
                    box-shadow: 0 0 0 1px rgba(130, 143, 255, 0.3) !important;
                  }

                  .login-auth-form-surface .semi-input::placeholder,
                  .login-auth-form-surface .semi-input-wrapper input::placeholder {
                    color: rgba(208, 214, 224, 0.68) !important;
                  }

                  .login-auth-banner-surface .semi-banner-description,
                  .login-auth-banner-surface .semi-banner-content-body,
                  .login-auth-banner-surface .semi-banner-content,
                  .login-auth-banner-surface .semi-typography,
                  .login-auth-footer-copy.semi-typography,
                  .login-auth-footer-copy {
                    color: #e2e8f0 !important;
                  }
                `}</style>

                {mode === 'login' ? (
                  <div
                    data-testid="login-auth-guidance-banner"
                    role="region"
                    aria-labelledby="login-auth-guidance-heading"
                    style={{ width: '100%' }}
                  >
                    <Banner
                      className="login-auth-banner-surface"
                      type="info"
                      fullMode={false}
                      closeIcon={null}
                      description={
                        <div>
                          <Typography.Title
                            heading={6}
                            id="login-auth-guidance-heading"
                            style={{ margin: '0 0 6px', color: '#f7f8f8' }}
                          >
                            登录模式提示
                          </Typography.Title>
                          <Typography.Paragraph style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.58 }}>
                            已有账号可直接进入共享控制台，继续同一套工作区。
                          </Typography.Paragraph>
                        </div>
                      }
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    data-testid="login-auth-guidance-banner"
                    role="region"
                    aria-labelledby="login-auth-guidance-heading"
                    style={{ width: '100%' }}
                  >
                    <Banner
                      className="login-auth-banner-surface"
                      type="success"
                      fullMode={false}
                      closeIcon={null}
                      description={
                        <div>
                          <Typography.Title
                            heading={6}
                            id="login-auth-guidance-heading"
                            style={{ margin: '0 0 6px', color: '#f7f8f8' }}
                          >
                            注册模式提示
                          </Typography.Title>
                          <Typography.Paragraph style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.58 }}>
                            注册后直接进入共享控制台，你可以继续前往项目市场、订单中心与 API Keys。
                          </Typography.Paragraph>
                        </div>
                      }
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0',
                      }}
                    />
                  </div>
                )}

                <Form onSubmit={onSubmit} labelPosition="top" style={{ width: '100%' }} className="login-auth-form-surface">
                  <Form.Input
                    field="email"
                    label="邮箱"
                    placeholder="name@example.com"
                    rules={[{ required: true, message: '请输入邮箱' }]}
                    fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }}
                    inputStyle={{ color: '#f7f8f8' }}
                  />
                  <Form.Input
                    field="password"
                    label="密码"
                    mode="password"
                    placeholder={mode === 'login' ? '请输入密码' : '至少 8 位密码'}
                    rules={[{ required: true, message: '请输入密码' }]}
                    fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }}
                    inputStyle={{ color: '#f7f8f8' }}
                  />
                  {mode === 'register' ? (
                    <Form.Input
                      field="confirm_password"
                      label="确认密码"
                      mode="password"
                      placeholder="再次输入密码"
                      rules={[{ required: true, message: '请再次输入密码' }]}
                      fieldStyle={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }}
                      inputStyle={{ color: '#f7f8f8' }}
                    />
                  ) : null}
                  {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
                  <Button htmlType="submit" theme="solid" type="primary" loading={loading} style={{ marginTop: 12, width: '100%', height: 44, borderRadius: 12, background: '#5e6ad2', border: '1px solid rgba(130, 143, 255, 0.92)', boxShadow: '0 12px 28px rgba(94,106,210,0.24)' }}>
                    {copy.button}
                  </Button>
                </Form>

                <Divider margin="12px" />
                <Typography.Text type="tertiary" className="login-auth-footer-copy">
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
