import { Button, Card, Form, Select, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { adminAdjustWallet, getAdminWalletUsers, getAdminDisputes, resolveAdminDispute, settleSupplierPending, OrderDispute, WalletOverview } from '../services/finance'

function disputeStatusColor(status: string) {
  switch (status) {
    case 'resolved':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'orange'
  }
}

export function buildDisputeResolutionPayload(values: {
  dispute_id: number | string
  status: 'resolved' | 'rejected'
  resolution_type?: string
  resolution_note?: string
  refund_amount?: number | string
}) {
  const status = values.status
  const refundAmount = status === 'rejected' ? 0 : Number(values.refund_amount || 0)
  const resolutionType = refundAmount > 0 ? 'refund' : (status === 'rejected' ? 'manual_adjustment' : (values.resolution_type || 'manual_adjustment'))
  return {
    disputeId: Number(values.dispute_id),
    payload: {
      status,
      resolution_type: resolutionType,
      resolution_note: values.resolution_note,
      refund_amount: refundAmount,
    },
  }
}

export function AdminUsersPage() {
  const [items, setItems] = useState<WalletOverview[]>([])
  const [disputes, setDisputes] = useState<OrderDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [disputeFilters, setDisputeFilters] = useState<{ status?: 'open' | 'resolved' | 'rejected'; limit: number }>({ limit: 100 })
  const [disputeDraft, setDisputeDraft] = useState<{ status: '' | 'open' | 'resolved' | 'rejected'; limit: number }>({ status: '', limit: 100 })
  const [form] = Form.useForm()
  const [settlementForm] = Form.useForm()
  const [disputeForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, disputeRes] = await Promise.all([
        getAdminWalletUsers(),
        getAdminDisputes({
          status: disputeFilters.status,
          limit: disputeFilters.limit,
        }),
      ])
      setItems(walletRes.items)
      setDisputes(disputeRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载管理员数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [disputeFilters])

  const handleAdjust = async () => {
    try {
      const values = await form.validate()
      await adminAdjustWallet(Number(values.user_id), Number(values.amount), values.reason)
      Toast.success('调账成功')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '调账失败')
    }
  }

  const handleSettleSupplier = async () => {
    try {
      const values = await settlementForm.validate()
      const result = await settleSupplierPending(Number(values.supplier_id), values.reason)
      Toast.success(`结算成功：¥${(Number(result.payout.settled_amount) / 100).toFixed(2)}，流水 ${result.payout.entry_count} 条`)
      settlementForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '供应商结算失败')
    }
  }

  const handleResolveDispute = async () => {
    try {
      const values = await disputeForm.validate()
      const { disputeId, payload } = buildDisputeResolutionPayload(values as {
        dispute_id: number | string
        status: 'resolved' | 'rejected'
        resolution_type?: string
        resolution_note?: string
        refund_amount?: number | string
      })
      await resolveAdminDispute(disputeId, payload)
      Toast.success('争议单处理完成')
      disputeForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '处理争议失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>用户管理</Typography.Title>
        <Typography.Paragraph>管理员可查看钱包余额、执行调账，并处理供应商/用户提交的订单争议。</Typography.Paragraph>
      </div>
      <Card title="管理员调账" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="user_id" label="用户 ID" rules={[{ required: true, message: '请输入用户 ID' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入调账金额' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="原因" rules={[{ required: true, message: '请输入调账原因' }]} />
          <Button type="primary" theme="solid" onClick={handleAdjust}>执行调账</Button>
        </Form>
      </Card>
      <Card title="供应商待结算确认" style={{ width: '100%' }}>
        <Typography.Paragraph>将供应商 pending 流水一次性标记为 settled，并把待结算余额迁移到已结算余额；操作会写入 settle_supplier_pending 审计。</Typography.Paragraph>
        <Form form={settlementForm} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="supplier_id" label="供应商用户 ID" rules={[{ required: true, message: '请输入供应商用户 ID' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="结算说明" rules={[{ required: true, message: '请输入结算说明' }]} />
          <Button type="primary" theme="solid" onClick={handleSettleSupplier}>确认结算</Button>
        </Form>
      </Card>
      <Card title="争议单处理" style={{ width: '100%' }}>
        <Typography.Paragraph>退款金额大于 0 时必须选择“原路退款”，驳回争议时退款金额必须为 0；处理后会写入 resolve_dispute 审计。</Typography.Paragraph>
        <Form form={disputeForm} layout="horizontal" labelPosition="left" initValues={{ status: 'resolved', resolution_type: 'manual_adjustment', refund_amount: 0 }}>
          <Form.InputNumber field="dispute_id" label="争议单 ID" rules={[{ required: true, message: '请输入争议单 ID' }]} style={{ width: '100%' }} />
          <Form.Select field="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}>
            <Select.Option value="resolved">通过并处理</Select.Option>
            <Select.Option value="rejected">驳回争议</Select.Option>
          </Form.Select>
          <Form.Select field="resolution_type" label="处理类型" rules={[{ required: true, message: '请选择处理类型' }]}>
            <Select.Option value="manual_adjustment">人工调整/无需退款</Select.Option>
            <Select.Option value="refund">原路退款</Select.Option>
          </Form.Select>
          <Form.InputNumber field="refund_amount" label="退款金额（分）" min={0} style={{ width: '100%' }} />
          <Form.Input field="resolution_note" label="处理备注" />
          <Button type="primary" theme="solid" onClick={handleResolveDispute}>处理争议单</Button>
        </Form>
      </Card>
      <Card title="争议单列表" style={{ width: '100%' }} loading={loading}>
        <Form layout="horizontal" labelPosition="left" initValues={disputeDraft}>
          <Form.Input
            field="status"
            label="状态筛选"
            placeholder="open / resolved / rejected，留空为全部"
            onChange={(value) => {
              const next = String(value || '').trim().toLowerCase()
              setDisputeDraft((prev) => ({ ...prev, status: (next === 'open' || next === 'resolved' || next === 'rejected' ? next : '') as '' | 'open' | 'resolved' | 'rejected' }))
            }}
          />
          <Form.InputNumber
            field="limit"
            label="最多条数"
            min={1}
            max={200}
            onChange={(value) => setDisputeDraft((prev) => ({ ...prev, limit: Number(value) || 100 }))}
            style={{ width: '100%' }}
          />
          <Button onClick={() => setDisputeFilters({ status: disputeDraft.status || undefined, limit: disputeDraft.limit })}>查询争议单</Button>
        </Form>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={disputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: '供应商 ID', dataIndex: 'supplier_id', key: 'supplier_id' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={disputeStatusColor(String(value))}>{String(value)}</Tag> },
            { title: '争议原因', dataIndex: 'reason', key: 'reason' },
            { title: '处理类型', dataIndex: 'resolution_type', key: 'resolution_type', render: (value) => value || '—' },
            { title: '退款金额', dataIndex: 'refund_amount', key: 'refund_amount', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
          ]}
        />
      </Card>
      <Card title="钱包用户列表" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="user_id"
          dataSource={items}
          columns={[
            { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '可用余额', dataIndex: 'available_balance', key: 'available_balance', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '冻结余额', dataIndex: 'frozen_balance', key: 'frozen_balance', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '待结算', dataIndex: 'pending_settlement', key: 'pending_settlement', render: (value) => `¥${(Number(value || 0) / 100).toFixed(2)}` },
          ]}
        />
      </Card>
    </Space>
  )
}
