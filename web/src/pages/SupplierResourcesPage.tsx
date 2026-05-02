import { Banner, Button, Card, Col, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArrowRight,
  IconBolt,
  IconMail,
  IconPriceTag,
  IconSafe,
  IconServer,
  IconTickCircle,
} from '@douyinfe/semi-icons'
import { JSX, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SupplierAccount,
  SupplierDomain,
  SupplierMailbox,
  createSupplierAccount,
  createSupplierDomain,
  createSupplierMailbox,
  getSupplierResourcesOverview,
} from '../services/activation'
import {
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
  hasMenuPath,
  resolvePreferredConsoleRoute,
} from '../utils/consoleNavigation'
import { useAuthStore } from '../store/authStore'

interface ResourceState {
  domains: SupplierDomain[]
  mailboxes: SupplierMailbox[]
  accounts: SupplierAccount[]
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

function sectionCardStyle() {
  return {
    width: '100%',
    borderRadius: 24,
    background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
  }
}

function countHealthyAccounts(accounts: SupplierAccount[]) {
  return accounts.filter((item) => item.health_status === 'healthy').length
}

function countActiveDomains(domains: SupplierDomain[]) {
  return domains.filter((item) => item.status === 'active').length
}

function countAvailableMailboxes(mailboxes: SupplierMailbox[]) {
  return mailboxes.filter((item) => item.status === 'available').length
}

const missionCards = [
  {
    key: 'domains',
    tag: 'Domains',
    title: '先维护域名池与 Catch-All',
    description: '优先确认区域、状态与 Catch-All 覆盖，再回到资源池与供货规则页补全可售路径。',
    button: '前往域名管理',
    path: SUPPLIER_DOMAINS_ROUTE,
    accent: 'rgba(14,165,233,0.18)',
  },
  {
    key: 'offerings',
    tag: 'Offerings',
    title: '继续收敛供货规则',
    description: '把账号池、邮箱池与项目规则串起来，明确成功率、优先级与供货来源。',
    button: '查看供货规则',
    path: SUPPLIER_OFFERINGS_ROUTE,
    accent: 'rgba(113,112,255,0.22)',
  },
  {
    key: 'settlements',
    tag: 'Settlement',
    title: '最后观察结算与争议',
    description: '当资源与规则稳定后，再进入供应商结算页观察待结算余额、争议与报表。',
    button: '打开供应商结算',
    path: SUPPLIER_SETTLEMENTS_ROUTE,
    accent: 'rgba(16,185,129,0.18)',
  },
] as const

function MissionFlowCard({
  tag,
  title,
  description,
  button,
  accent,
  onClick,
}: {
  tag: string
  title: string
  description: string
  button: string
  accent: string
  onClick: () => void
}) {
  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${accent}`,
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
        <Tag color="grey">{tag}</Tag>
        <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', margin: 0 }}>
          {description}
        </Typography.Paragraph>
        <Button
          type="primary"
          theme="borderless"
          icon={<IconArrowRight />}
          style={{ color: '#a5b4fc', paddingLeft: 0 }}
          onClick={onClick}
        >
          {button}
        </Button>
      </Space>
    </Card>
  )
}

const consolePillars = [
  {
    key: 'single-shell',
    label: '单一供应商工作台',
    summary: '域名池、邮箱池、第三方邮箱账号池与供货规则继续留在同一套登录后深色控制台内。',
  },
  {
    key: 'resource-ops',
    label: '资源运营优先级',
    summary: '先补齐域名与账号健康，再维护邮箱映射与可售规则，避免把接入问题推迟到订单阶段。',
  },
  {
    key: 'role-aware',
    label: '角色差异但不拆后台',
    summary: '供应商仍共用统一 Layout，只通过菜单、页面说明与运营动作体现供给侧差异。',
  },
] as const

export function SupplierResourcesPage() {
  const navigate = useNavigate()
  const menu = useAuthStore((state) => state.menu)
  const role = useAuthStore((state) => state.user?.role)
  const [data, setData] = useState<ResourceState>({ domains: [], mailboxes: [], accounts: [] })
  const [loading, setLoading] = useState(false)
  const [domainSubmitting, setDomainSubmitting] = useState(false)
  const [accountSubmitting, setAccountSubmitting] = useState(false)
  const [mailboxSubmitting, setMailboxSubmitting] = useState(false)
  const [domainForm] = Form.useForm()
  const [accountForm] = Form.useForm()
  const [mailboxForm] = Form.useForm()

  const canOpenDomains = hasMenuPath(menu, SUPPLIER_DOMAINS_ROUTE)
  const canOpenOfferings = hasMenuPath(menu, SUPPLIER_OFFERINGS_ROUTE)
  const canOpenSettlements = hasMenuPath(menu, SUPPLIER_SETTLEMENTS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const visibleMissionCards = missionCards.filter((item) => hasMenuPath(menu, item.path))
  const fallbackRoute = resolvePreferredConsoleRoute(menu, role)
  const shouldShowMissionFallback =
    !canOpenDomains &&
    !canOpenOfferings &&
    !canOpenSettlements &&
    fallbackRoute !== SUPPLIER_DOMAINS_ROUTE &&
    fallbackRoute !== SUPPLIER_RESOURCES_ROUTE
  const shouldShowSharedConsoleFallback =
    !canOpenApiKeys && !canOpenWebhooks && !canOpenDocs && fallbackRoute !== SUPPLIER_RESOURCES_ROUTE

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSupplierResourcesOverview()
      setData(res)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载供应商资源失败')
      setData({ domains: [], mailboxes: [], accounts: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const submitDomain = async () => {
    try {
      const values = await domainForm.validate()
      setDomainSubmitting(true)
      await createSupplierDomain({
        name: values.name,
        region: values.region,
        catch_all: Boolean(values.catch_all),
        status: values.status,
      })
      Toast.success('域名池已新增')
      domainForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增域名失败')
    } finally {
      setDomainSubmitting(false)
    }
  }

  const submitAccount = async () => {
    try {
      const values = await accountForm.validate()
      setAccountSubmitting(true)
      await createSupplierAccount({
        provider: values.provider,
        source_type: values.source_type,
        auth_mode: values.auth_mode,
        protocol_mode: values.protocol_mode,
        identifier: values.identifier,
        host: values.host,
        port: values.port ? Number(values.port) : undefined,
        refresh_token: values.refresh_token,
        credential_secret: values.credential_secret,
        secret_ref: values.secret_ref,
        bridge_endpoint: values.bridge_endpoint,
        bridge_label: values.bridge_label,
        status: values.status,
      })
      Toast.success('第三方邮箱账号已新增')
      accountForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增账号失败')
    } finally {
      setAccountSubmitting(false)
    }
  }

  const submitMailbox = async () => {
    try {
      const values = await mailboxForm.validate()
      setMailboxSubmitting(true)
      await createSupplierMailbox({
        project_key: values.project_key,
        domain_id: values.domain_id ? Number(values.domain_id) : undefined,
        account_id: values.account_id ? Number(values.account_id) : undefined,
        local_part: values.local_part,
        address: values.address,
        source_type: values.source_type,
        status: values.status,
      })
      Toast.success('邮箱池已新增')
      mailboxForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增邮箱失败')
    } finally {
      setMailboxSubmitting(false)
    }
  }

  const activeDomains = useMemo(() => countActiveDomains(data.domains), [data.domains])
  const healthyAccounts = useMemo(() => countHealthyAccounts(data.accounts), [data.accounts])
  const availableMailboxes = useMemo(() => countAvailableMailboxes(data.mailboxes), [data.mailboxes])
  const catchAllDomains = useMemo(() => data.domains.filter((item) => item.catch_all).length, [data.domains])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.36)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="green" shape="circle">
            Supplier Resource Mission Control
          </Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>
              供应商资源
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              在同一套深色共享控制台里统一维护域名池、邮箱池与第三方邮箱账号池，让供给准备、健康检查与后续供货规则保持单壳闭环。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconServer />}>供应商视角 · 统一资源运营工作台</Tag>
            <Tag color="grey" prefixIcon={<IconSafe />}>OAuth2 / 授权码 / App Password / Bridge 录入仍走真实资源接口</Tag>
            <Tag color="grey" prefixIcon={<IconTickCircle />}>资源就绪后继续进入供货规则与结算页，不切换独立后台</Tag>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="建议顺序：先维护域名池与账号健康，再补邮箱映射，最后回到供货规则确认库存与售价；整条供给链路都保留在单一登录后控制台中。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="域名池" value={String(data.domains.length)} description="当前供应商可运营的域名总数" icon={<IconServer />} />
        <MetricCard title="Active 域名" value={String(activeDomains)} description="仍可参与供货的域名记录" icon={<IconTickCircle />} />
        <MetricCard title="健康账号" value={String(healthyAccounts)} description="健康状态为 healthy 的第三方邮箱账号" icon={<IconActivity />} />
        <MetricCard title="可用邮箱池" value={String(availableMailboxes)} description="状态为 available 的邮箱 / 别名记录" icon={<IconMail />} />
      </Space>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={16}>
          <Card title={<span style={{ color: '#f7f8f8' }}>供应商任务流</span>} style={sectionCardStyle()} bodyStyle={{ padding: 20 }}>
            <Row gutter={[16, 16]} data-testid="supplier-resources-mission-flow">
              {visibleMissionCards.map((item) => (
                <Col xs={24} md={8} key={item.key}>
                  <MissionFlowCard
                    tag={item.tag}
                    title={item.title}
                    description={item.description}
                    button={item.button}
                    accent={item.accent}
                    onClick={() => navigate(item.path)}
                  />
                </Col>
              ))}
              {shouldShowMissionFallback ? (
                <Col xs={24} md={8}>
                  <Card
                    data-testid="supplier-resources-mission-fallback"
                    style={{
                      height: '100%',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.82) 100%)',
                      border: '1px solid rgba(148,163,184,0.14)',
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                      <Tag color="cyan">Fallback</Tag>
                      <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0 }}>
                        返回推荐工作台继续供应商主链路
                      </Typography.Title>
                      <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', margin: 0 }}>
                        当前菜单未暴露域名、供货或结算入口时，继续回到服务端授予的共享工作台完成下一步运营闭环。
                      </Typography.Paragraph>
                      <Button
                        type="primary"
                        theme="borderless"
                        icon={<IconArrowRight />}
                        style={{ color: '#67e8f9', paddingLeft: 0 }}
                        onClick={() => navigate(fallbackRoute)}
                      >
                        返回推荐工作台
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ) : null}
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card style={sectionCardStyle()} bodyStyle={{ padding: 20 }}>
            <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
              <div data-testid="supplier-resources-shared-console-bridge" style={{ width: '100%' }}>
                <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0 }}>
                  共享控制台联动
                </Typography.Title>
                <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', marginTop: 8, marginBottom: 0 }}>
                  资源侧页面继续和 API Keys、Webhook 与 Docs 处于同一套共享控制台中，避免把供应商接入路径拆成独立后台。
                </Typography.Paragraph>
              </div>
              {consolePillars.map((item) => (
                <Card
                  key={item.key}
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 8 }}>
                    {item.label}
                  </Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.72)' }}>
                    {item.summary}
                  </Typography.Paragraph>
                </Card>
              ))}
              <Space wrap>
                {canOpenApiKeys ? (
                  <Button icon={<IconSafe />} onClick={() => navigate(API_KEYS_ROUTE)}>
                    API Keys · {API_KEYS_ROUTE}
                  </Button>
                ) : null}
                {canOpenWebhooks ? (
                  <Button icon={<IconBolt />} onClick={() => navigate(WEBHOOKS_ROUTE)}>
                    Webhook 设置 · {WEBHOOKS_ROUTE}
                  </Button>
                ) : null}
                {canOpenDocs ? (
                  <Button icon={<IconPriceTag />} onClick={() => navigate(DOCS_ROUTE)}>
                    API 文档 · {DOCS_ROUTE}
                  </Button>
                ) : null}
                {shouldShowSharedConsoleFallback ? (
                  <Button
                    data-testid="supplier-resources-shared-console-fallback"
                    theme="solid"
                    type="primary"
                    icon={<IconArrowRight />}
                    onClick={() => navigate(fallbackRoute)}
                  >
                    返回推荐工作台
                  </Button>
                ) : null}
              </Space>
              <Space wrap>
                <Tag color="blue">Catch-All：{catchAllDomains}</Tag>
                <Tag color="green">健康账号：{healthyAccounts}</Tag>
                <Tag color="cyan">可用邮箱池：{availableMailboxes}</Tag>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={8}>
          <Card title="新增域名池" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Typography.Paragraph style={{ color: '#475569' }}>
              先补齐可售域名与区域信息，再回到供货规则页完成库存策略。
            </Typography.Paragraph>
            <Form form={domainForm} layout="horizontal" labelPosition="top" initValues={{ region: 'global', status: 'active', catch_all: true }}>
              <Form.Input field="name" label="域名" placeholder="mail.nexus.example" rules={[{ required: true, message: '请输入域名' }]} />
              <Form.Input field="region" label="区域" placeholder="global / hk / us" />
              <Form.Input field="status" label="状态" placeholder="active / inactive" />
              <Form.Slot label="Catch-All">
                <Form.Checkbox field="catch_all">启用 Catch-All</Form.Checkbox>
              </Form.Slot>
              <Button theme="solid" type="primary" loading={domainSubmitting} onClick={() => void submitDomain()}>
                保存域名
              </Button>
            </Form>
            <Typography.Text style={{ color: '#94a3b8', fontSize: 12 }}>
              当前默认会保持 Catch-All 开启与 active 状态；如需调整，可在后续运营流中再细化。
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="新增第三方邮箱账号" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Typography.Paragraph style={{ color: '#475569' }}>
              录入公网邮箱或桥接账号，确保后续邮箱池与供货规则能引用真实可用账号。
            </Typography.Paragraph>
            <Form form={accountForm} layout="horizontal" labelPosition="top" initValues={{ source_type: 'public_mailbox_account', auth_mode: 'oauth2', protocol_mode: 'imap_pull', status: 'active' }}>
              <Form.Input field="provider" label="Provider" rules={[{ required: true, message: '请输入 provider' }]} placeholder="outlook / gmail / qq / proton" />
              <Form.Input field="identifier" label="账号标识" rules={[{ required: true, message: '请输入邮箱或账号标识' }]} placeholder="supplier@example.com" />
              <Form.Input field="source_type" label="来源类型" />
              <Form.Input field="auth_mode" label="认证方式" />
              <Form.Input field="protocol_mode" label="协议模式" />
              <Form.Input field="host" label="主机" placeholder="imap.gmail.com / 127.0.0.1" />
              <Form.InputNumber field="port" label="端口" placeholder="993 / 995 / 1143" style={{ width: '100%' }} />
              <Form.Input field="refresh_token" label="Refresh Token" placeholder="OAuth2 必填，授权码/App Password 可留空" />
              <Form.Input field="credential_secret" label="凭证密文" placeholder="App Password / 授权码 / Bridge 密码" />
              <Form.Input field="secret_ref" label="Secret Ref" placeholder="env://NEXUS_QQ_AUTH_CODE" />
              <Form.Input field="bridge_endpoint" label="Bridge Endpoint" placeholder="127.0.0.1:1143" />
              <Form.Input field="bridge_label" label="Bridge Label" placeholder="proton-bridge" />
              <Form.Input field="status" label="状态" />
              <Button theme="solid" type="primary" loading={accountSubmitting} onClick={() => void submitAccount()}>
                保存账号
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="新增邮箱池 / 别名池" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Typography.Paragraph style={{ color: '#475569' }}>
              把域名池或账号池映射成真实可售邮箱记录，为项目库存和供给路由做准备。
            </Typography.Paragraph>
            <Form form={mailboxForm} layout="horizontal" labelPosition="top" initValues={{ source_type: 'self_hosted_domain', status: 'available' }}>
              <Form.Input field="project_key" label="项目键" rules={[{ required: true, message: '请输入项目键' }]} placeholder="openai" />
              <Form.Input field="domain_id" label="域名 ID" placeholder="可选，与 account_id 至少填一项" />
              <Form.Input field="account_id" label="账号 ID" placeholder="可选，与 domain_id 至少填一项" />
              <Form.Input field="local_part" label="local part" placeholder="agent-001" />
              <Form.Input field="address" label="完整地址" placeholder="可直接录完整邮箱" />
              <Form.Input field="source_type" label="来源类型" />
              <Form.Input field="status" label="状态" />
              <Button theme="solid" type="primary" loading={mailboxSubmitting} onClick={() => void submitMailbox()}>
                保存邮箱
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={8}>
          <Card title="域名池" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={data.domains}
              columns={[
                { title: '域名', dataIndex: 'name', key: 'name' },
                { title: '区域', dataIndex: 'region', key: 'region' },
                { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'active' ? 'green' : 'grey'}>{String(value)}</Tag> },
                { title: 'Catch-All', dataIndex: 'catch_all', key: 'catch_all', render: (value) => (value ? '已开启' : '关闭') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="第三方邮箱账号池" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={data.accounts}
              columns={[
                { title: 'Provider', dataIndex: 'provider', key: 'provider' },
                { title: '账号', dataIndex: 'identifier', key: 'identifier' },
                { title: '来源', dataIndex: 'source_type', key: 'source_type' },
                { title: '认证', dataIndex: 'auth_mode', key: 'auth_mode' },
                { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode' },
                { title: '健康度', dataIndex: 'health_status', key: 'health_status', render: (value) => value || 'unknown' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="邮箱池 / 别名池" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={data.mailboxes}
              columns={[
                { title: '地址', dataIndex: 'address', key: 'address' },
                { title: '项目', dataIndex: 'project_key', key: 'project_key' },
                { title: '来源', dataIndex: 'source_type', key: 'source_type' },
                { title: '状态', dataIndex: 'status', key: 'status' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
