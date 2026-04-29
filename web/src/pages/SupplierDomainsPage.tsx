import { Banner, Button, Card, Checkbox, Col, Empty, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { SupplierDomain, createSupplierDomain, getSupplierResourcesOverview } from '../services/activation'

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

export function SupplierDomainsPage() {
  const [domains, setDomains] = useState<SupplierDomain[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSupplierResourcesOverview()
      setDomains(res.domains ?? [])
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载域名池失败')
      setDomains([])
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
    const regions = new Set(domains.map((item) => item.region).filter(Boolean)).size
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

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>域名管理</Typography.Title>
        <Typography.Paragraph>
          面向供应商的域名池运营页：集中查看 Catch-All 覆盖、可用状态与区域分布，并在同一共享控制台中快速补充新域名。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="本页复用真实 /supplier/resources/overview 与 /supplier/resources/domains 接口，只聚焦域名池运营，不重复承担邮箱池与账号池的全量录入。"
        style={{ width: '100%' }}
      />

      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={6}>
          <Card title="域名总数" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary.total}</Typography.Title>
            <Typography.Text type="tertiary">当前供应商域名池记录</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Active 域名" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary.active}</Typography.Title>
            <Typography.Text type="tertiary">可参与供货的域名数量</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Catch-All 已开启" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary.catchAll}</Typography.Title>
            <Typography.Text type="tertiary">支持泛收件的域名数量</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="覆盖区域" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary.regions}</Typography.Title>
            <Typography.Text type="tertiary">去重后的 region 数量</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card title="域名池列表" style={{ width: '100%' }} loading={loading}>
            {domains.length === 0 ? (
              <Empty description="暂无域名池记录，可先在右侧创建第一条域名。" />
            ) : (
              <Table
                pagination={false}
                rowKey="id"
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
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
            <Card title="快速新增域名" style={{ width: '100%' }}>
              <Form form={form} layout="horizontal" labelPosition="top" initValues={{ region: 'global', status: 'active', catch_all: true }}>
                <Form.Input field="name" label="域名" placeholder="mail.nexus.example" rules={[{ required: true, message: '请输入域名' }]} />
                <Form.Input field="region" label="区域" placeholder="global / hk / us" />
                <Form.Input field="status" label="状态" placeholder="active / inactive" />
                <Form.Slot label="Catch-All">
                  <Checkbox defaultChecked onChange={(event) => form.setValue('catch_all', event.target.checked)}>启用 Catch-All</Checkbox>
                </Form.Slot>
                <Button theme="solid" type="primary" loading={submitting} onClick={() => void handleCreate()}>
                  保存域名
                </Button>
              </Form>
            </Card>

            <Card title="区域分布" style={{ width: '100%' }} loading={loading}>
              {topRegions.length === 0 ? (
                <Typography.Text type="tertiary">暂无可统计区域。</Typography.Text>
              ) : (
                <Space wrap>
                  {topRegions.map(([region, count]) => (
                    <Tag key={region} color="blue">{region} · {count}</Tag>
                  ))}
                </Space>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
