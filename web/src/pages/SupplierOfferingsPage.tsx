import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArrowRight,
  IconBolt,
  IconPriceTag,
  IconSafe,
  IconServer,
  IconTickCircle,
} from '@douyinfe/semi-icons'
import { JSX, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupplierOfferings, getSupplierResourcesOverview, InventoryItem, saveSupplierOffering, SupplierDomain } from '../services/activation'
import {
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

function money(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
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
    key: 'resources',
    tag: 'Resources',
    title: '先确认资源池已就绪',
    description: '先检查域名池、邮箱池与账号健康，再决定哪些项目规则应进入可售状态。',
    button: '查看供应商资源',
    path: SUPPLIER_RESOURCES_ROUTE,
    accent: 'rgba(14,165,233,0.18)',
  },
  {
    key: 'settlements',
    tag: 'Settlement',
    title: '再追踪结算与争议反馈',
    description: '供货规则稳定后回到供应商结算页，观察待结算余额、争议与履约反馈是否需要反调价格。',
    button: '打开供应商结算',
    path: SUPPLIER_SETTLEMENTS_ROUTE,
    accent: 'rgba(16,185,129,0.18)',
  },
  {
    key: 'api-keys',
    tag: 'Shared Console',
    title: '保持接入能力仍在同一控制台',
    description: 'API Keys、Webhook 与 Docs 继续留在统一深色壳中，供应商只是在同一控制台追加供给侧操作。',
    button: '打开 API Keys',
    path: API_KEYS_ROUTE,
    accent: 'rgba(113,112,255,0.22)',
  },
] as const

const consolePillars = [
  {
    key: 'single-shell',
    label: '单一登录后控制台',
    summary: '供货规则、供应商资源、结算与接入配置继续共用同一套深色共享控制台，不拆第二套后台。',
  },
  {
    key: 'supply-routing',
    label: '供给编排优先',
    summary: '优先把项目、域名、来源类型、成功率与优先级串成一条供给路径，再进入结算与风控复盘。',
  },
  {
    key: 'role-aware',
    label: '角色扩展但不伪造升级',
    summary: '供应商能力来自服务端授予的角色扩展；当前页面只强调共享控制台中的供给侧职责，不制造额外后台或本地升级假象。',
  },
] as const

function countCatalogProjects(offerings: InventoryItem[]) {
  return new Set(offerings.map((item) => item.project_key).filter(Boolean)).size
}

function countHighConfidenceOfferings(offerings: InventoryItem[]) {
  return offerings.filter((item) => Number(item.success_rate) >= 0.9).length
}

function countReadyDomains(domains: SupplierDomain[]) {
  return domains.filter((domain) => domain.status === 'active').length
}

function topSourceTypes(offerings: InventoryItem[]) {
  const counts = new Map<string, number>()
  for (const item of offerings) {
    const key = String(item.source_type || 'unknown').trim() || 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
}

export function SupplierOfferingsPage() {
  const navigate = useNavigate()
  const [domains, setDomains] = useState<SupplierDomain[]>([])
  const [offerings, setOfferings] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [resourcesRes, offeringsRes] = await Promise.all([getSupplierResourcesOverview(), getSupplierOfferings()])
      setDomains(resourcesRes.domains ?? [])
      setOfferings(offeringsRes.items ?? [])
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载供货规则失败')
      setDomains([])
      setOfferings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const metrics = useMemo(() => {
    const total = offerings.length
    const projectCount = countCatalogProjects(offerings)
    const highConfidence = countHighConfidenceOfferings(offerings)
    const readyDomains = countReadyDomains(domains)
    return { total, projectCount, highConfidence, readyDomains }
  }, [domains, offerings])

  const sourceSummary = useMemo(() => topSourceTypes(offerings), [offerings])

  const handleSave = async () => {
    try {
      const values = await form.validate()
      setSubmitting(true)
      await saveSupplierOffering({
        project_key: values.project_key,
        domain_id: Number(values.domain_id),
        price: Number(values.price),
        success_rate: Number(values.success_rate),
        priority: Number(values.priority ?? 0),
        source_type: values.source_type,
        protocol_mode: values.protocol_mode,
      })
      Toast.success('供货规则已保存')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '保存供货规则失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(98,93,255,0.22) 0%, rgba(17,18,20,0.96) 58%, rgba(10,11,13,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.38)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <Tag color="purple" size="large">Supplier Mission Control</Tag>
          <Space vertical align="start" spacing={8}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f8fafc' }}>
              供货规则编排中枢
            </Typography.Title>
            <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.82)', maxWidth: 920 }}>
              在单一登录后的深色共享控制台里，先检查供应商资源 readiness，再把项目、域名池、来源类型、成功率与优先级收敛为一条真实可售路径。
              API Keys、Webhook 与 Docs 仍在同一套壳中联动，不额外拆出第二个供应商后台。
            </Typography.Paragraph>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="供应商角色能力由服务端菜单与权限扩展控制；当前页面只收敛供给侧编排任务，不把本地文案误写成角色升级事实。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.32)', borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)' }}
          />
          <Space wrap spacing={16} style={{ width: '100%' }}>
            <MetricCard title="可售规则数" value={String(metrics.total)} description="当前已经进入共享控制台供给编排的规则总数。" icon={<IconBolt />} />
            <MetricCard title="覆盖项目" value={String(metrics.projectCount)} description="已被至少一条供货规则接管的 project_key 数量。" icon={<IconActivity />} />
            <MetricCard title="高成功率规则" value={String(metrics.highConfidence)} description="成功率 ≥ 90% 的规则数量，可作为主推供给池。" icon={<IconTickCircle />} />
            <MetricCard title="可挂接域名池" value={String(metrics.readyDomains)} description="状态 active 的域名池数量，可继续映射到项目规则。" icon={<IconServer />} />
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
              继续沿 new-api 风格单壳控制台推进资源准备 → 供货编排 → 结算复盘，不切换冗余后台。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }}>
            {missionSteps.map((step) => (
              <Card
                key={step.key}
                style={{
                  flex: '1 1 250px',
                  minWidth: 250,
                  borderRadius: 20,
                  background: `linear-gradient(180deg, ${step.accent} 0%, rgba(15,23,42,0.55) 100%)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                bodyStyle={{ padding: 20 }}
              >
                <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                  <Tag color="white">{step.tag}</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{step.title}</Typography.Title>
                  <Typography.Text style={{ color: 'rgba(226,232,240,0.78)' }}>{step.description}</Typography.Text>
                  <Button theme="solid" type="primary" icon={<IconArrowRight />} onClick={() => navigate(step.path)}>
                    {step.button}
                  </Button>
                </Space>
              </Card>
            ))}
          </Space>
        </Space>
      </Card>

      <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
              共享控制台联动
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
              供货侧页面继续和共享接入能力、文档与结算页处于同一控制台中，避免把供应商体验拆成独立后台。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }}>
            {consolePillars.map((pillar) => (
              <Card
                key={pillar.key}
                style={{
                  flex: '1 1 240px',
                  minWidth: 240,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={10}>
                  <Typography.Text strong style={{ color: '#f8fafc' }}>{pillar.label}</Typography.Text>
                  <Typography.Text style={{ color: 'rgba(203,213,225,0.74)' }}>{pillar.summary}</Typography.Text>
                </Space>
              </Card>
            ))}
          </Space>
          <Space wrap spacing={12}>
            <Button icon={<IconSafe />} onClick={() => navigate(API_KEYS_ROUTE)}>
              API Keys · {API_KEYS_ROUTE}
            </Button>
            <Button icon={<IconBolt />} onClick={() => navigate(WEBHOOKS_ROUTE)}>
              Webhook 设置 · {WEBHOOKS_ROUTE}
            </Button>
            <Button icon={<IconPriceTag />} onClick={() => navigate(DOCS_ROUTE)}>
              API 文档 · {DOCS_ROUTE}
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="新增 / 更新供货规则" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Form form={form} layout="horizontal" labelPosition="left" initValues={{ source_type: 'domain', protocol_mode: '', success_rate: 0.95, priority: 10 }}>
          <Form.Input field="project_key" label="项目键" rules={[{ required: true, message: '请输入项目键' }]} placeholder="discord" />
          <Form.Select
            field="domain_id"
            label="域名池"
            rules={[{ required: true, message: '请选择域名池' }]}
            optionList={domains.map((domain) => ({ label: `${domain.name} (#${domain.id})`, value: domain.id }))}
          />
          <Form.InputNumber field="price" label="售价（分）" min={0} rules={[{ required: true, message: '请输入售价' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="success_rate" label="预估成功率" min={0} max={1} step={0.01} rules={[{ required: true, message: '请输入成功率' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="priority" label="分配优先级" min={0} style={{ width: '100%' }} />
          <Form.Select
            field="source_type"
            label="来源类型"
            optionList={[
              { label: '自建域名/域名池', value: 'domain' },
              { label: 'Public Mailbox', value: 'public_mailbox_account' },
              { label: 'Hosted Mailbox', value: 'hosted_mailbox' },
              { label: 'Bridge Mailbox', value: 'bridge_mailbox' },
            ]}
          />
          <Form.Input field="protocol_mode" label="协议模式" placeholder="imap_pull / pop3_pull，可留空" />
          <Button type="primary" theme="solid" loading={submitting} onClick={handleSave}>保存供货规则</Button>
        </Form>
      </Card>

      <Card title="当前可售规则" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Space wrap>
            {sourceSummary.length === 0 ? (
              <Typography.Text type="tertiary">暂无供货来源统计，先创建第一条规则以收敛项目与资源映射。</Typography.Text>
            ) : (
              sourceSummary.map(([sourceType, count]) => (
                <Tag key={sourceType} color="blue">{sourceType} · {count}</Tag>
              ))
            )}
          </Space>
          <Table
            pagination={false}
            rowKey="id"
            dataSource={offerings}
            columns={[
              { title: '项目', dataIndex: 'project_key', key: 'project_key' },
              { title: '项目名称', dataIndex: 'project_name', key: 'project_name' },
              { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
              { title: '售价', dataIndex: 'price', key: 'price', render: (value) => money(Number(value)) },
              { title: '库存', dataIndex: 'stock', key: 'stock' },
              { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${(Number(value) * 100).toFixed(1)}%` },
              { title: '优先级', dataIndex: 'priority', key: 'priority' },
              { title: '来源', dataIndex: 'source_type', key: 'source_type', render: (value) => <Tag color="blue">{String(value)}</Tag> },
              { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode', render: (value) => value || '—' },
            ]}
          />
        </Space>
      </Card>
    </Space>
  )
}
