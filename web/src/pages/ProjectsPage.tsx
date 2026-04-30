import { Banner, Button, Card, Col, Empty, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconBolt, IconBriefStroked, IconHistogram, IconServer } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createActivationOrder, getInventory, InventoryItem } from '../services/activation'
import { useAuthStore } from '../store/authStore'
import { hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

function formatCurrency(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function statusTone(stock: number) {
  if (stock > 20) return 'green'
  if (stock > 0) return 'orange'
  return 'red'
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
        <Tag color="grey" prefixIcon={icon}>{title}</Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>{value}</Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getInventory()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = useMemo(() => items, [items])
  const availableCount = useMemo(() => grouped.filter((item) => Number(item.stock || 0) > 0).length, [grouped])
  const totalStock = useMemo(() => grouped.reduce((sum, item) => sum + Number(item.stock || 0), 0), [grouped])
  const uniqueProjects = useMemo(() => new Set(grouped.map((item) => item.project_key)).size, [grouped])
  const topSuccess = useMemo(() => grouped.reduce((best, item) => Math.max(best, Number(item.success_rate || 0)), 0), [grouped])
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const canOpenOrders = hasMenuPath(menu, '/orders')
  const canOpenDocs = hasMenuPath(menu, '/docs')

  const handleCreate = async (record: InventoryItem) => {
    setCreatingKey(`${record.project_key}-${record.domain_id}`)
    try {
      const res = await createActivationOrder(record.project_key, record.domain_id)
      Toast.success(`已创建订单 ${res.order.order_no}，邮箱：${res.order.email_address}`)
      await load()
      if (canOpenOrders) {
        navigate('/orders')
      }
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '创建订单失败')
    } finally {
      setCreatingKey('')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">用户采购入口</Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>项目市场</Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              面向共享控制台中的采购角色，先确认真实库存、价格和供给来源，再从同一工作台直接发起下单并回到订单中心继续追踪。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconBriefStroked />}>单一登录后控制台 · 用户工作台</Tag>
            <Tag color="grey" prefixIcon={<IconServer />}>库存与来源来自真实 `/projects/inventory` 返回</Tag>
            {canOpenDocs ? <Tag color="blue">继续 API 接入准备：文档与密钥配置仍留在同一控制台</Tag> : null}
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="可售项目" value={String(uniqueProjects)} description="当前可直接采购的项目种类" icon={<IconBriefStroked />} />
        <MetricCard title="可售库存池" value={String(totalStock)} description="所有可见域名池库存总量" icon={<IconServer />} />
        <MetricCard title="可立即下单" value={String(availableCount)} description="仍有库存的供给组合数" icon={<IconBolt />} />
        <MetricCard title="最高成功率" value={`${Math.round(topSuccess * 100)}%`} description="当前库存中可见的最佳供给成功率" icon={<IconHistogram />} />
      </Space>

      <Banner
        type="info"
        fullMode={false}
        description="Phase 2 已打通项目 -> 库存 -> 下单 -> 订单轮询主链路。此页继续强化 shared-console 采购视角，突出项目、库存、成功率和下一个动作，而不是停留在占位式列表。"
      />

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={17}>
          <Card title="实时供给列表" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 0 }}>
            <Table
              loading={loading}
              pagination={false}
              rowKey={(record?: InventoryItem) => `${record?.project_key ?? 'unknown'}-${record?.domain_id ?? 0}`}
              dataSource={grouped}
              empty={
                <Empty
                  description="当前暂无可售库存，请稍后再试或联系管理员补充供给。"
                  image={null}
                >
                  <Space>
                    <Button theme="solid" type="primary" onClick={() => void load()}>
                      重新拉取库存
                    </Button>
                    {canOpenDocs ? (
                      <Button theme="borderless" type="primary" onClick={() => navigate('/docs')}>
                        查看 API 文档
                      </Button>
                    ) : null}
                    {fallbackRoute !== '/projects' ? (
                      <Button theme="borderless" type="tertiary" onClick={() => navigate(fallbackRoute)}>
                        返回推荐工作台
                      </Button>
                    ) : null}
                  </Space>
                </Empty>
              }
              columns={[
                { title: '项目', dataIndex: 'project_name', key: 'project_name' },
                { title: '项目键', dataIndex: 'project_key', key: 'project_key', render: (value) => <Tag color="blue">{String(value)}</Tag> },
                { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
                { title: '来源类型', dataIndex: 'source_type', key: 'source_type', render: (value) => <Tag color="grey">{String(value)}</Tag> },
                { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode', render: (value) => value || 'smtp_inbound' },
                { title: '价格', dataIndex: 'price', key: 'price', render: (value) => formatCurrency(Number(value)) },
                { title: '库存', dataIndex: 'stock', key: 'stock', render: (value) => <Tag color={statusTone(Number(value || 0))}>{String(value)}</Tag> },
                { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${Math.round(Number(value) * 100)}%` },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Button
                      theme="solid"
                      type="primary"
                      disabled={record.stock <= 0}
                      loading={creatingKey === `${record.project_key}-${record.domain_id}`}
                      onClick={() => handleCreate(record)}
                    >
                      {record.stock > 0 ? '立即下单' : '库存不足'}
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card title="采购动作提示" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              <Card style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.94) 100%)', border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ padding: 18 }}>
                <Typography.Title heading={5} style={{ marginTop: 0 }}>先挑库存，再下单</Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>
                  优先比较成功率、库存与来源类型，再决定是否下单；保持采购动作、订单追踪和 API 接入都在同一控制台完成。
                </Typography.Paragraph>
              </Card>
              <Card style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.94) 100%)', border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ padding: 18 }}>
                <Typography.Title heading={5} style={{ marginTop: 0 }}>下单后下一步</Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>
                  成功创建订单后，直接前往订单中心查看邮箱分配、提取结果和是否 READY / FINISHED，无需跳转到独立后台。
                </Typography.Paragraph>
                {canOpenOrders ? (
                  <Button type="primary" theme="solid" style={{ marginTop: 12 }} onClick={() => navigate('/orders')}>
                    打开订单中心
                  </Button>
                ) : null}
              </Card>
              <Card style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.94) 100%)', border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ padding: 18 }}>
                <Typography.Title heading={5} style={{ marginTop: 0 }}>共享控制台回退路径</Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>
                  如果当前库存为空或本页不再是你的首选入口，可通过统一菜单权限回到该角色最合适的工作台，而不是寻找另一套后台。
                </Typography.Paragraph>
                {fallbackRoute !== '/projects' ? (
                  <Button theme="borderless" type="primary" style={{ marginTop: 12 }} onClick={() => navigate(fallbackRoute)}>
                    返回推荐工作台
                  </Button>
                ) : null}
              </Card>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="供给概览说明" style={{ width: '100%', borderRadius: 24 }}>
        <Space wrap>
          <Tag color="green">库存充足：大于 20</Tag>
          <Tag color="orange">库存告警：1 - 20</Tag>
          <Tag color="red">库存耗尽：0</Tag>
          <Tag color="blue">价格按分存储，已换算为人民币展示：{grouped[0] ? formatCurrency(grouped[0].price) : '¥0.00'}</Tag>
        </Space>
      </Card>
    </Space>
  )
}
