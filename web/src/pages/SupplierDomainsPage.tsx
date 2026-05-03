import { Banner, Button, Card, Col, Empty, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArrowRight,
  IconBolt,
  IconSafe,
  IconServer,
  IconTickCircle,
} from '@douyinfe/semi-icons'
import { JSX, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SupplierDomain, createSupplierDomain, getSupplierResourcesOverview } from '../services/activation'
import { useAuthStore } from '../store/authStore'
import {
  API_KEYS_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
  hasMenuPath,
  resolvePreferredConsoleRoute,
} from '../utils/consoleNavigation'

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'green'
    case 'inactive':
      return 'grey'
    default:
      return 'blue'
  }
}

function countByRegion(domains: SupplierDomain[]) {
  const counts = new Map<string, number>()
  for (const domain of domains) {
    const key = String(domain.region || 'unknown').trim() || 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
}

function sectionCardStyle() {
  return {
    width: '100%',
    borderRadius: 24,
    background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
  }
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: JSX.Element
}) {
  return (
    <Card
      style={{
        flex: '1 1 220px',
        minWidth: 220,
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
        <Tag color="grey" prefixIcon={icon}>
          {title}
        </Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>
          {value}
        </Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}

const missionSteps = [
  {
    key: 'domains',
    tag: 'Domains',
    title: '先确认域名池与 Catch-All 覆盖',
    description: '优先核对域名状态、Catch-All 开启情况与区域分布，确保可售资源入口稳定。',
    button: '留在域名管理',
    path: SUPPLIER_DOMAINS_ROUTE,
    accent: 'rgba(14,165,233,0.18)',
    current: true,
  },
  {
    key: 'resources',
    tag: 'Resources',
    title: '继续补齐邮箱池与账号映射',
    description: '域名池就绪后回到供应商资源页，把 mailbox 与第三方邮箱账号健康状态补齐为真实供给底座。',
    button: '查看供应商资源',
    path: SUPPLIER_RESOURCES_ROUTE,
    accent: 'rgba(113,112,255,0.22)',
  },
  {
    key: 'offerings',
    tag: 'Offerings',
    title: '再进入供货规则编排',
    description: '把 ready 域名继续映射到项目规则、价格与成功率，保持供给编排与结算复盘在同一壳中闭环。',
    button: '继续维护供货规则',
    path: SUPPLIER_OFFERINGS_ROUTE,
    accent: 'rgba(16,185,129,0.18)',
  },
] as const

const consolePillars = [
  {
    key: 'single-shell',
    label: '单一供应商工作台',
    summary: '域名管理、资源录入、供货规则与结算复盘继续共用同一套深色共享控制台，不拆第二个供应商后台。',
  },
  {
    key: 'domain-readiness',
    label: '域名 readiness 优先',
    summary: '先明确 active / inactive、Catch-All 与 region 覆盖，再把问题后移给邮箱池、项目规则或财务页面。',
  },
  {
    key: 'role-aware',
    label: '角色扩展但不伪造升级',
    summary: '供应商能力来自服务端授予的角色扩展；当前页面只聚焦共享控制台中的域名运营，不制造额外后台或本地升级假象。',
  },
] as const

export function SupplierDomainsPage() {
  const navigate = useNavigate()
  const { menu, user } = useAuthStore()
  const [domains, setDomains] = useState<SupplierDomain[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form] = Form.useForm()

  const canOpenResources = hasMenuPath(menu, SUPPLIER_RESOURCES_ROUTE)
  const canOpenOfferings = hasMenuPath(menu, SUPPLIER_OFFERINGS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const canOpenSettlements = hasMenuPath(menu, SUPPLIER_SETTLEMENTS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const shouldShowMissionFallback = useMemo(
    () => fallbackRoute !== SUPPLIER_DOMAINS_ROUTE && !canOpenResources && !canOpenOfferings,
    [canOpenOfferings, canOpenResources, fallbackRoute],
  )
  const shouldShowBridgeFallback = useMemo(
    () => fallbackRoute !== SUPPLIER_DOMAINS_ROUTE && !canOpenApiKeys && !canOpenWebhooks && !canOpenDocs && !canOpenSettlements,
    [canOpenApiKeys, canOpenDocs, canOpenSettlements, canOpenWebhooks, fallbackRoute],
  )

  const load = async () => {
    setLoading(true)
    try {
      setLoadError('')
      const res = await getSupplierResourcesOverview()
      setDomains(res.domains ?? [])
    } catch (error: any) {
      const message = error?.response?.data?.error ?? '加载域名池失败'
      Toast.error(message)
      setDomains([])
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const summary = useMemo(() => {
    const total = domains.length
    const active = domains.filter((item) => item.status === 'active').length
    const catchAll = domains.filter((item) => item.catch_all).length
    const normalizedRegions = domains.map((item) => String(item.region || 'unknown').trim() || 'unknown')
    const regions = new Set(normalizedRegions).size
    return { total, active, catchAll, regions }
  }, [domains])

  const topRegions = useMemo(() => countByRegion(domains), [domains])

  const handleCreate = async () => {
    try {
      const values = await form.validate()
      setSubmitting(true)
      await createSupplierDomain({
        name: String(values.name || '').trim(),
        region: String(values.region || '').trim() || 'global',
        catch_all: Boolean(values.catch_all),
        status: String(values.status || '').trim() || 'active',
      })
      Toast.success('域名池已新增')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增域名失败')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleMissionSteps = missionSteps.filter((step) => {
    if (step.path === SUPPLIER_DOMAINS_ROUTE) return true
    if (step.path === SUPPLIER_RESOURCES_ROUTE) return canOpenResources
    if (step.path === SUPPLIER_OFFERINGS_ROUTE) return canOpenOfferings
    return true
  })

  const visibleBridgeLinks = [
    ...(canOpenApiKeys ? [{ label: `API Keys · ${API_KEYS_ROUTE}`, summary: '继续核对密钥分发与白名单联动。', path: API_KEYS_ROUTE, icon: <IconSafe /> }] : []),
    ...(canOpenWebhooks ? [{ label: `Webhook 设置 · ${WEBHOOKS_ROUTE}`, summary: '在同一共享控制台中继续回调联调与投递验证。', path: WEBHOOKS_ROUTE, icon: <IconBolt /> }] : []),
    ...(canOpenDocs ? [{ label: `API 文档 · ${DOCS_ROUTE}`, summary: '返回文档页确认真实对外接入规则与示例。', path: DOCS_ROUTE, icon: <IconServer /> }] : []),
    ...(canOpenSettlements ? [{ label: `供应商结算 · ${SUPPLIER_SETTLEMENTS_ROUTE}`, summary: '域名供给稳定后，再回到结算页观察财务与争议反馈。', path: SUPPLIER_SETTLEMENTS_ROUTE, icon: <IconActivity /> }] : []),
  ]

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.22) 0%, rgba(17,18,20,0.96) 58%, rgba(10,11,13,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.38)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <Tag color="blue" size="large">Supplier Domain Mission Control</Tag>
          <Space vertical align="start" spacing={8}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f8fafc' }}>
              域名池运营中枢
            </Typography.Title>
            <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.82)', maxWidth: 920 }}>
              在单一登录后的深色共享控制台里，先确认域名状态、Catch-All 覆盖与区域 readiness，再把邮箱池、供货规则与结算复盘继续留在同一套壳中推进。
              API Keys、Webhook 与 Docs 仍作为同一控制台的共享入口联动，不额外拆出第二个供应商后台。
            </Typography.Paragraph>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="真实 /supplier/resources/overview 与 /supplier/resources/domains 仍是域名池唯一数据底座；当前页面只升级为 mission-control 视图，帮助先识别域名 readiness，再进入资源映射与供货编排。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.32)', borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)' }}
          />
          <Space wrap spacing={16} style={{ width: '100%' }}>
            <MetricCard title="域名总数" value={String(summary.total)} description="当前供应商域名池记录。" icon={<IconServer />} />
            <MetricCard title="Active 域名" value={String(summary.active)} description="可继续参与供货编排的域名数量。" icon={<IconTickCircle />} />
            <MetricCard title="Catch-All 已开启" value={String(summary.catchAll)} description="支持泛收件的域名数量。" icon={<IconBolt />} />
            <MetricCard title="覆盖区域" value={String(summary.regions)} description="去重后的 region 数量。" icon={<IconActivity />} />
          </Space>
        </Space>
      </Card>

      <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
              供应商主任务流
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
              继续沿 new-api 风格单壳控制台推进域名 readiness → 资源映射 → 供货编排，不切换冗余后台。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }} data-testid="supplier-domains-mission-flow">
            {visibleMissionSteps.map((step) => (
              <Card
                key={step.key}
                style={{
                  flex: '1 1 250px',
                  minWidth: 250,
                  borderRadius: 20,
                  background: `linear-gradient(180deg, ${step.accent} 0%, rgba(15,23,42,0.55) 100%)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                  <Tag color="white">{step.tag}</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>
                    {step.title}
                  </Typography.Title>
                  <Typography.Text style={{ color: 'rgba(226,232,240,0.76)' }}>{step.description}</Typography.Text>
                  {step.current ? (
                    <Tag color="blue">当前域名运营阶段</Tag>
                  ) : (
                    <Button theme="borderless" type="primary" icon={<IconArrowRight />} onClick={() => navigate(step.path)}>
                      {step.button}
                    </Button>
                  )}
                </Space>
              </Card>
            ))}
            {shouldShowMissionFallback ? (
              <div data-testid="supplier-domains-mission-fallback">
                <Button theme="solid" type="primary" onClick={() => navigate(fallbackRoute)}>
                  返回推荐工作台
                </Button>
              </div>
            ) : null}
          </Space>
        </Space>
      </Card>

      <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
              控制台能力矩阵
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
              域名池准备完成后，继续在同一登录后的共享控制台中补齐资源映射、供货规则与接入联动。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }}>
            {consolePillars.map((pillar) => (
              <Card
                key={pillar.key}
                style={{
                  flex: '1 1 260px',
                  minWidth: 260,
                  borderRadius: 20,
                  background: 'rgba(15,23,42,0.48)',
                  border: '1px solid rgba(148,163,184,0.16)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={10}>
                  <Tag color="grey">{pillar.label}</Tag>
                  <Typography.Text style={{ color: 'rgba(226,232,240,0.76)' }}>{pillar.summary}</Typography.Text>
                </Space>
              </Card>
            ))}
          </Space>
        </Space>
      </Card>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card data-testid="supplier-domains-table-card" style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
            <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
              <div>
                <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
                  域名池列表
                </Typography.Title>
                <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
                  当前已加载域名池记录会直接影响后续邮箱映射与供货规则编排，先在这里完成基本运营判断。
                </Typography.Paragraph>
              </div>
              {loadError ? (
                <Banner
                  type="danger"
                  fullMode={false}
                  description={`${loadError}，请先恢复真实 /supplier/resources/overview 后再继续域名运营。`}
                  style={{ width: '100%', background: 'rgba(127, 29, 29, 0.24)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 18 }}
                />
              ) : domains.length === 0 ? (
                <Empty description="暂无域名池记录，可先在右侧创建第一条域名。" />
              ) : (
                <Table
                  pagination={false}
                  rowKey="id"
                  loading={loading}
                  dataSource={domains}
                  columns={[
                    { title: '域名', dataIndex: 'name', key: 'name' },
                    { title: '区域', dataIndex: 'region', key: 'region', render: (value) => value || 'global' },
                    {
                      title: 'Catch-All',
                      dataIndex: 'catch_all',
                      key: 'catch_all',
                      render: (value) => <Tag color={value ? 'green' : 'grey'}>{value ? '已开启' : '未开启'}</Tag>,
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (value) => <Tag color={statusColor(String(value))}>{String(value)}</Tag>,
                    },
                  ]}
                />
              )}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
            <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
              <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                <div>
                  <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
                    快速新增域名
                  </Typography.Title>
                  <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
                    保持真实域名录入能力不变，只把新增动作收敛进深色共享控制台的域名运营切片中。
                  </Typography.Paragraph>
                </div>
                <Form form={form} layout="horizontal" labelPosition="top" initValues={{ region: 'global', status: 'active', catch_all: true }}>
                  <Form.Input field="name" label="域名" placeholder="mail.nexus.example" rules={[{ required: true, message: '请输入域名' }]} />
                  <Form.Input field="region" label="区域" placeholder="global / hk / us" />
                  <Form.Input field="status" label="状态" placeholder="active / inactive" />
                  <Form.Switch field="catch_all" label="Catch-All" />
                  <Button theme="solid" type="primary" loading={submitting} onClick={() => void handleCreate()}>
                    保存域名
                  </Button>
                </Form>
              </Space>
            </Card>

            <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
              <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                <div>
                  <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
                    共享控制台联动
                  </Typography.Title>
                  <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
                    域名池准备完成后，继续在同一登录态中验证接入密钥、Webhook 与文档，不拆第二套供应商后台。
                  </Typography.Paragraph>
                </div>
                <Space vertical align="start" spacing={12} style={{ width: '100%' }} data-testid="supplier-domains-shared-console-bridge">
                  {visibleBridgeLinks.map((item) => (
                    <Card
                      key={item.path}
                      style={{
                        width: '100%',
                        borderRadius: 18,
                        background: 'rgba(15,23,42,0.48)',
                        border: '1px solid rgba(148,163,184,0.16)',
                      }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <Space vertical align="start" spacing={8} style={{ width: '100%' }}>
                        <Tag color="white" prefixIcon={item.icon}>{item.label}</Tag>
                        <Typography.Text style={{ color: 'rgba(226,232,240,0.76)' }}>{item.summary}</Typography.Text>
                        <Button
                          theme="borderless"
                          type="primary"
                          aria-label={`打开 ${item.label}`}
                          icon={<IconArrowRight />}
                          onClick={() => navigate(item.path)}>
                          打开{item.label}
                        </Button>
                      </Space>
                    </Card>
                  ))}
                  {shouldShowBridgeFallback ? (
                    <div data-testid="supplier-domains-shared-console-fallback">
                      <Button theme="solid" type="primary" onClick={() => navigate(fallbackRoute || DASHBOARD_ROUTE)}>
                        返回推荐工作台
                      </Button>
                    </div>
                  ) : null}
                </Space>
              </Space>
            </Card>

            <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
              <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                <div>
                  <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
                    区域分布
                  </Typography.Title>
                  <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
                    仅基于当前已加载域名池统计区域，帮助判断是否需要先回到资源或规则页补足区域覆盖。
                  </Typography.Paragraph>
                </div>
                {loadError ? (
                  <Typography.Text type="danger">域名池加载失败时暂停显示区域统计，请先恢复上游概览接口。</Typography.Text>
                ) : topRegions.length === 0 ? (
                  <Typography.Text type="tertiary">暂无可统计区域。</Typography.Text>
                ) : (
                  <Space wrap>
                    {topRegions.map(([region, count]) => (
                      <Tag key={region} color="blue">{region} · {count}</Tag>
                    ))}
                  </Space>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
