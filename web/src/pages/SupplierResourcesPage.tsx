import { Banner, Button, Card, Col, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArrowRight,
  IconMail,
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
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
} from '../utils/consoleNavigation'

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
]

export function SupplierResourcesPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ResourceState>({ domains: [], mailboxes: [], accounts: [] })
  const [loading, setLoading] = useState(false)
  const [domainSubmitting, setDomainSubmitting] = useState(false)
  const [accountSubmitting, setAccountSubmitting] = useState(false)
  const [mailboxSubmitting, setMailboxSubmitting] = useState(false)
  const [domainForm] = Form.useForm()
  const [accountForm] = Form.useForm()
  const [mailboxForm] = Form.useForm()

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
        status: values.status,
        host: values.host,
        port: values.port ? Number(values.port) : undefined,
        refresh_token: values.refresh_token,
        credential_secret: values.credential_secret,
        secret_ref: values.secret_ref,
        bridge_endpoint: values.bridge_endpoint,
        bridge_label: values.bridge_label,
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
        domain_id: values.domain_id ? Number(values.domain_id) : undefined,
        account_id: values.account_id ? Number(values.account_id) : undefined,
        local_part: values.local_part,
        address: values.address,
        source_type: values.source_type,
        project_key: values.project_key,
        status: values.status,
      })
      Toast.success('邮箱池记录已新增')
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
            <Row gutter={[16, 16]}>
              {missionCards.map((item) => (
                <Col xs={24} md={8} key={item.key}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                      border: `1px solid ${item.accent}`,
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                      <Tag color="grey">{item.tag}</Tag>
                      <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0 }}>
                        {item.title}
                      </Typography.Title>
                      <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', margin: 0 }}>
                        {item.description}
                      </Typography.Paragraph>
                      <Button
                        type="primary"
                        theme="borderless"
                        icon={<IconArrowRight />}
                        style={{ color: '#a5b4fc', paddingLeft: 0 }}
                        onClick={() => navigate(item.path)}
                      >
                        {item.button}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title={<span style={{ color: '#f7f8f8' }}>控制台能力矩阵</span>} style={sectionCardStyle()} bodyStyle={{ padding: 20 }}>
            <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
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
                  render: (value) => <Tag color={String(value) === 'active' ? 'green' : 'grey'}>{String(value)}</Tag>,
                },
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
                { title: '邮箱地址', dataIndex: 'address', key: 'address' },
                { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
                { title: '项目', dataIndex: 'project_key', key: 'project_key' },
                { title: 'Provider', dataIndex: 'provider', key: 'provider', render: (value) => value || '自建域名' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (value) => <Tag color={String(value) === 'available' ? 'green' : 'purple'}>{String(value)}</Tag>,
                },
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
                { title: '认证', dataIndex: 'auth_mode', key: 'auth_mode' },
                { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode' },
                {
                  title: '健康状态',
                  dataIndex: 'health_status',
                  key: 'health_status',
                  render: (value) => <Tag color={value === 'healthy' ? 'green' : 'red'}>{String(value || 'unknown')}</Tag>,
                },
                { title: 'Bridge', dataIndex: 'bridge_endpoint', key: 'bridge_endpoint', render: (value) => value || '-' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="资源运营提示" style={sectionCardStyle()} bodyStyle={{ padding: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              style={{
                height: '100%',
                borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 8 }}>
                先补资源，再谈供货
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', marginBottom: 0 }}>
                如果账号健康状态异常或邮箱池为空，优先回到这里补齐资源，而不是直接去改价格或等待订单失败后再回查。
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                height: '100%',
                borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 8 }}>
                与供货规则联动
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', marginBottom: 0 }}>
                当项目需要新来源类型或协议模式时，先在资源页补账号/邮箱，再回到供货规则页确认售价、优先级与成功率。
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                height: '100%',
                borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Typography.Title heading={6} style={{ color: '#f7f8f8', marginBottom: 8 }}>
                保持供应商单壳闭环
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.74)', marginBottom: 0 }}>
                资源、供货、结算与争议都应在同一登录后控制台内连续完成，不为供应商单独拆一套后台。
              </Typography.Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  )
}
