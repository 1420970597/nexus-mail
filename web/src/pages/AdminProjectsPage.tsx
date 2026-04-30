import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconArticle, IconBolt, IconServer } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InventoryItem, ProjectItem, getAdminProjectOfferings, getAdminProjects, updateAdminProject } from '../services/activation'
import { useAuthStore } from '../store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_RISK_ROUTE,
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  hasMenuPath,
  resolvePreferredConsoleRoute,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

interface MissionCard {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
}

interface CapabilitySignal {
  key: string
  value: string
}

function formatCurrency(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function percentLabel(value: number) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function overviewTone(active: boolean) {
  return active ? 'green' : 'red'
}

function statusSummary(projects: ProjectItem[]) {
  const activeCount = projects.filter((item) => item.is_active !== false).length
  const pausedCount = projects.filter((item) => item.is_active === false).length
  return { activeCount, pausedCount }
}

export function AdminProjectsPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [offerings, setOfferings] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form] = Form.useForm()

  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const canOpenRisk = hasMenuPath(menu, ADMIN_RISK_ROUTE)
  const canOpenAudit = hasMenuPath(menu, ADMIN_AUDIT_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)

  const load = async () => {
    setLoading(true)
    try {
      const [projectsRes, offeringsRes] = await Promise.all([getAdminProjects(), getAdminProjectOfferings()])
      setProjects(projectsRes.items)
      setOfferings(offeringsRes.items)
      if (projectsRes.items.length > 0) {
        const target = selectedId ? projectsRes.items.find((item) => item.id === selectedId) ?? projectsRes.items[0] : projectsRes.items[0]
        setSelectedId(target.id)
        form.setValues({
          name: target.name,
          description: target.description,
          default_price: target.default_price,
          success_rate: target.success_rate,
          timeout_seconds: target.timeout_seconds,
          is_active: target.is_active ?? true,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedProject = useMemo(() => projects.find((item) => item.id === selectedId) ?? null, [projects, selectedId])
  const filteredOfferings = useMemo(
    () => (selectedProject ? offerings.filter((item) => item.project_id === selectedProject.id) : offerings),
    [offerings, selectedProject],
  )
  const { activeCount, pausedCount } = useMemo(() => statusSummary(projects), [projects])
  const mappedSuppliers = useMemo(() => new Set(filteredOfferings.map((item) => item.supplier_id)).size, [filteredOfferings])
  const liveStock = useMemo(() => filteredOfferings.reduce((sum, item) => sum + Number(item.stock || 0), 0), [filteredOfferings])
  const topSuccess = useMemo(
    () => filteredOfferings.reduce((best, item) => Math.max(best, Number(item.success_rate || 0)), 0),
    [filteredOfferings],
  )

  const missionCards = useMemo<MissionCard[]>(
    () => [
      ...(canOpenRisk
        ? [{
            key: 'risk',
            title: '先对照风控阈值',
            description: '更新项目价格、成功率或超时前，先回到风控中心确认超时、争议与限流信号是否提示该项目存在履约风险。',
            button: '查看风控中心',
            path: ADMIN_RISK_ROUTE,
            tag: 'Risk',
          }]
        : []),
      ...(canOpenAudit
        ? [{
            key: 'audit',
            title: '再回看审计轨迹',
            description: '针对管理员调账、结算与 API Key 运行时审计，保持项目配置调整与高危运营记录处于同一控制台语境中。',
            button: '查看审计日志',
            path: ADMIN_AUDIT_ROUTE,
            tag: 'Audit',
          }]
        : []),
      ...(canOpenApiKeys
        ? [{
            key: 'integration',
            title: '最后串联接入入口',
            description: '当价格与供给策略调整完成后，继续回到 API Keys / Webhooks / Docs 校验对外接入叙事仍与共享控制台一致。',
            button: '打开 API Keys',
            path: API_KEYS_ROUTE,
            tag: 'Integration',
          }]
        : []),
    ],
    [canOpenApiKeys, canOpenAudit, canOpenRisk],
  )

  const capabilitySignals = useMemo<CapabilitySignal[]>(
    () => [
      { key: '角色壳模式', value: '管理员扩展菜单仍挂在同一共享控制台，不做独立后台' },
      { key: '风控联动', value: canOpenRisk ? '已接入管理员风控中心' : '等待风控菜单权限' },
      { key: '审计联动', value: canOpenAudit ? '已接入管理员审计查询' : '等待审计菜单权限' },
      { key: '接入入口', value: canOpenApiKeys && canOpenWebhooks && canOpenDocs ? 'API Keys / Webhooks / Docs 已与管理端同壳收敛' : '共享接入入口尚未全部可见' },
    ],
    [canOpenApiKeys, canOpenAudit, canOpenDocs, canOpenRisk, canOpenWebhooks],
  )

  const handleSelect = (project: ProjectItem) => {
    setSelectedId(project.id)
    form.setValues({
      name: project.name,
      description: project.description,
      default_price: project.default_price,
      success_rate: project.success_rate,
      timeout_seconds: project.timeout_seconds,
      is_active: project.is_active ?? true,
    })
  }

  const handleSave = async () => {
    if (!selectedProject) {
      return
    }
    try {
      const values = await form.validate()
      setSaving(true)
      await updateAdminProject(selectedProject.id, {
        name: values.name,
        description: values.description,
        default_price: Number(values.default_price),
        success_rate: Number(values.success_rate),
        timeout_seconds: Number(values.timeout_seconds),
        is_active: Boolean(values.is_active),
      })
      Toast.success(`项目 ${selectedProject.key} 配置已更新`)
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '更新项目失败')
    } finally {
      setSaving(false)
    }
  }

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
          <Tag color="cyan" shape="circle">Admin Pricing Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>价格策略</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 860 }}>
                将管理员项目配置页升级为深色共享控制台中的价格策略工作台，把项目属性、供应商报价映射、风控审计与接入入口保持在同一套 new-api 风格壳内。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">单一登录后控制台</Tag>
              <Tag color="green">管理员扩展菜单</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="这里不再停留在 Phase 2 的浅色表单页，而是作为管理员深色运营工作台：先判断供给与成功率，再调整价格与超时，并回到风控/审计/接入入口继续闭环验证。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconServer />}>管理员项目配置与报价映射来自真实 /admin/projects /admin/projects/offerings</Tag>
            {canOpenDocs ? <Tag color="blue" prefixIcon={<IconArticle />}>API 文档仍保持同域共享入口</Tag> : null}
            {canOpenWebhooks ? <Tag color="cyan" prefixIcon={<IconBolt />}>Webhook 联调继续留在同一控制台</Tag> : null}
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="已启用项目" value={String(activeCount)} description="当前仍可对外售卖的项目数量" />
        <MetricCard title="暂停项目" value={String(pausedCount)} description="已停用或需要人工审查的项目数量" />
        <MetricCard title="映射供应商" value={String(mappedSuppliers)} description="当前选中项目在报价映射中的供给侧覆盖数" />
        <MetricCard title="映射库存" value={String(liveStock)} description={`选中项目报价映射内的实时库存总量（最高成功率 ${percentLabel(topSuccess)}）`} />
      </Space>

      {missionCards.length > 0 ? (
        <Card
          title={<span style={{ color: '#f8fafc' }}>管理员任务流</span>}
          style={{ width: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          bodyStyle={{ padding: 20 }}
        >
          <Space wrap style={{ width: '100%' }} spacing={16}>
            {missionCards.map((item) => (
              <Card
                key={item.key}
                style={{
                  flex: '1 1 260px',
                  minWidth: 260,
                  borderRadius: 20,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(94,106,210,0.24)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                  <Tag color="cyan">{item.tag}</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{item.title}</Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.72)' }}>{item.description}</Typography.Paragraph>
                  <Button type="primary" theme="solid" onClick={() => navigate(item.path)}>
                    {item.button}
                  </Button>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      ) : null}

      <Card title="控制台能力矩阵" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
        <Table
          pagination={false}
          rowKey="key"
          dataSource={capabilitySignals}
          columns={[
            { title: '能力维度', dataIndex: 'key', key: 'key' },
            { title: '当前状态', dataIndex: 'value', key: 'value' },
          ]}
        />
      </Card>

      <Card title="项目列表" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={projects}
          columns={[
            { title: '项目键', dataIndex: 'key', key: 'key', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '项目名称', dataIndex: 'name', key: 'name' },
            { title: '默认价', dataIndex: 'default_price', key: 'default_price', render: (value) => formatCurrency(Number(value)) },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => percentLabel(Number(value)) },
            { title: '超时', dataIndex: 'timeout_seconds', key: 'timeout_seconds', render: (value) => `${value}s` },
            { title: '状态', dataIndex: 'is_active', key: 'is_active', render: (value) => <Tag color={overviewTone(Boolean(value))}>{value ? '启用' : '停用'}</Tag> },
            { title: '操作', key: 'action', render: (_, record) => <Button theme="light" onClick={() => handleSelect(record)}>编辑</Button> },
          ]}
        />
      </Card>

      <Card title={selectedProject ? `编辑项目 · ${selectedProject.key}` : '编辑项目'} style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.Input field="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]} />
          <Form.Input field="description" label="项目描述" />
          <Form.InputNumber field="default_price" label="默认价格（分）" rules={[{ required: true, message: '请输入默认价格' }]} min={0} />
          <Form.InputNumber field="success_rate" label="成功率" rules={[{ required: true, message: '请输入成功率' }]} min={0} max={1} step={0.01} />
          <Form.InputNumber field="timeout_seconds" label="超时时间（秒）" rules={[{ required: true, message: '请输入超时秒数' }]} min={1} />
          <Form.Switch field="is_active" label="启用状态" />
          <Button type="primary" theme="solid" loading={saving} disabled={!selectedProject} onClick={handleSave}>保存配置</Button>
        </Form>
      </Card>

      <Card title="供应商报价 / 库存映射" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey={(record?: InventoryItem) => `${record?.project_key ?? 'unknown'}-${record?.domain_id ?? 0}`}
          dataSource={filteredOfferings}
          columns={[
            { title: '项目', dataIndex: 'project_name', key: 'project_name' },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '供应商 ID', dataIndex: 'supplier_id', key: 'supplier_id' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type', render: (value) => <Tag color="grey">{String(value)}</Tag> },
            { title: '价格', dataIndex: 'price', key: 'price', render: (value) => formatCurrency(Number(value)) },
            { title: '库存', dataIndex: 'stock', key: 'stock', render: (value) => <Tag color={Number(value) > 0 ? 'green' : 'red'}>{String(value)}</Tag> },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => percentLabel(Number(value)) },
          ]}
        />
      </Card>

      <Card title="运营提醒" style={{ width: '100%', borderRadius: 24 }}>
        <Space wrap>
          <Tag color="green" prefixIcon={<IconActivity />}>价格与成功率调整后，建议立即回到风控中心确认风险信号是否同步变化</Tag>
          <Tag color="blue" prefixIcon={<IconArticle />}>若需验证接入叙事，可继续进入 API Keys / Webhooks / Docs，保持管理端与共享接入路径统一</Tag>
          {fallbackRoute !== '/admin/pricing' ? (
            <Button theme="borderless" type="primary" onClick={() => navigate(fallbackRoute)}>
              返回推荐工作台
            </Button>
          ) : null}
        </Space>
      </Card>
    </Space>
  )
}

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
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
        <Tag color="grey">{title}</Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>{value}</Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}
