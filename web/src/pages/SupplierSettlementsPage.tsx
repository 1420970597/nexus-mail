import { Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import {
  createSupplierDispute,
  getSupplierCostProfiles,
  getSupplierDisputes,
  getSupplierReports,
  getSupplierSettlementOverview,
  saveSupplierCostProfile,
  OrderDispute,
  SupplierCostProfile,
  SupplierReportRow,
  SupplierSettlementEntry,
  WalletOverview,
} from '../services/finance'

function disputeTagColor(status: string) {
  switch (status) {
    case 'open':
      return 'orange'
    case 'resolved':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'grey'
  }
}

export function SupplierSettlementsPage() {
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [entries, setEntries] = useState<SupplierSettlementEntry[]>([])
  const [profiles, setProfiles] = useState<SupplierCostProfile[]>([])
  const [reports, setReports] = useState<SupplierReportRow[]>([])
  const [disputes, setDisputes] = useState<OrderDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [reportFilters, setReportFilters] = useState({ from: '', to: '', limit: 100 })
  const [reportDraft, setReportDraft] = useState({ from: '', to: '', limit: 100 })
  const [costForm] = Form.useForm()
  const [disputeForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [overviewRes, profileRes, reportRes, disputeRes] = await Promise.all([
        getSupplierSettlementOverview(),
        getSupplierCostProfiles(),
        getSupplierReports({
          from: reportFilters.from || undefined,
          to: reportFilters.to || undefined,
          limit: reportFilters.limit,
        }),
        getSupplierDisputes(),
      ])
      setWallet(overviewRes.wallet)
      setEntries(overviewRes.entries)
      setProfiles(profileRes.items)
      setReports(reportRes.items)
      setDisputes(disputeRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载供应商结算数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [reportFilters])

  const handleSaveProfile = async () => {
    try {
      const values = await costForm.validate()
      await saveSupplierCostProfile({
        project_key: values.project_key,
        cost_per_success: Number(values.cost_per_success),
        cost_per_timeout: Number(values.cost_per_timeout),
        currency: values.currency,
        status: values.status,
        notes: values.notes,
      })
      Toast.success('成本模型已保存')
      costForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '保存成本模型失败')
    }
  }

  const handleCreateDispute = async () => {
    try {
      const values = await disputeForm.validate()
      await createSupplierDispute(Number(values.order_id), values.reason)
      Toast.success('争议单已提交')
      disputeForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '提交争议失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供应商结算</Typography.Title>
        <Typography.Paragraph>查看待结算金额、成本模型、项目报表与争议单，完成 Phase 4 供应商财务闭环。</Typography.Paragraph>
      </div>
      <Card style={{ width: '100%' }} loading={loading}>
        <Space spacing={24}>
          <Tag color="green">待结算：¥{((wallet?.pending_settlement ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="blue">账户余额：¥{((wallet?.available_balance ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="orange">冻结余额：¥{((wallet?.frozen_balance ?? 0) / 100).toFixed(2)}</Tag>
        </Space>
      </Card>
      <Card title="供应商成本模型" style={{ width: '100%' }} loading={loading}>
        <Form form={costForm} layout="horizontal" labelPosition="left" initValues={{ currency: 'CNY', status: 'active' }}>
          <Form.Input field="project_key" label="项目键" rules={[{ required: true, message: '请输入项目键' }]} />
          <Form.InputNumber field="cost_per_success" label="成功成本（分）" rules={[{ required: true, message: '请输入成功成本' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="cost_per_timeout" label="超时成本（分）" rules={[{ required: true, message: '请输入超时成本' }]} style={{ width: '100%' }} />
          <Form.Input field="currency" label="币种" />
          <Form.Input field="status" label="状态" />
          <Form.Input field="notes" label="备注" />
          <Button type="primary" theme="solid" onClick={handleSaveProfile}>保存成本模型</Button>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          pagination={false}
          rowKey="id"
          dataSource={profiles}
          columns={[
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '成功成本', dataIndex: 'cost_per_success', key: 'cost_per_success', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '超时成本', dataIndex: 'cost_per_timeout', key: 'cost_per_timeout', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '币种', dataIndex: 'currency', key: 'currency' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '备注', dataIndex: 'notes', key: 'notes', render: (value) => value || '—' },
          ]}
        />
      </Card>
      <Card title="项目报表" style={{ width: '100%' }} loading={loading}>
        <Form layout="horizontal" labelPosition="left" initValues={reportDraft}>
          <Form.Input
            field="from"
            label="开始日期"
            placeholder="YYYY-MM-DD"
            onChange={(value) => setReportDraft((prev) => ({ ...prev, from: String(value ?? '') }))}
          />
          <Form.Input
            field="to"
            label="结束日期"
            placeholder="YYYY-MM-DD"
            onChange={(value) => setReportDraft((prev) => ({ ...prev, to: String(value ?? '') }))}
          />
          <Form.InputNumber
            field="limit"
            label="最多项目数"
            min={1}
            max={200}
            onChange={(value) => setReportDraft((prev) => ({ ...prev, limit: Number(value) || 100 }))}
            style={{ width: '100%' }}
          />
          <Button onClick={() => setReportFilters(reportDraft)}>查询报表</Button>
        </Form>
        <Table
          pagination={false}
          rowKey="project_key"
          dataSource={reports}
          columns={[
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '总订单', dataIndex: 'total_orders', key: 'total_orders' },
            { title: '完成', dataIndex: 'finished_orders', key: 'finished_orders' },
            { title: '超时', dataIndex: 'timeout_orders', key: 'timeout_orders' },
            { title: '争议单', dataIndex: 'disputed_orders', key: 'disputed_orders' },
            { title: '营收', dataIndex: 'gross_revenue', key: 'gross_revenue', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '成本', dataIndex: 'modeled_cost', key: 'modeled_cost', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '毛利', dataIndex: 'estimated_gross_pnl', key: 'estimated_gross_pnl', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
          ]}
        />
      </Card>
      <Card title="供应商争议单" style={{ width: '100%' }} loading={loading}>
        <Form form={disputeForm} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="order_id" label="订单 ID" rules={[{ required: true, message: '请输入订单 ID' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="争议原因" rules={[{ required: true, message: '请输入争议原因' }]} />
          <Button type="primary" theme="solid" onClick={handleCreateDispute}>提交争议</Button>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          pagination={false}
          rowKey="id"
          dataSource={disputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={disputeTagColor(String(value))}>{String(value)}</Tag> },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
            { title: '退款金额', dataIndex: 'refund_amount', key: 'refund_amount', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '处理备注', dataIndex: 'resolution_note', key: 'resolution_note', render: (value) => value || '—' },
          ]}
        />
      </Card>
      <Card title="结算流水" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={entries}
          columns={[
            { title: '订单', dataIndex: 'order_id', key: 'order_id' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'pending' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
