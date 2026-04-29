import { Banner, Button, Card, Col, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconAlertTriangle, IconPulse, IconShield, IconTickCircle } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { createUserOrderDispute, getWalletOverview, getWalletTransactions, topupWallet, OrderDispute, WalletOverview, WalletTransaction } from '../services/finance'

function amountLabel(value: number) {
  return `¥${((Number(value || 0)) / 100).toFixed(2)}`
}

function MetricCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: JSX.Element }) {
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

export function BalancePage() {
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupForm] = Form.useForm()
  const [disputeForm] = Form.useForm()
  const [recentDisputes, setRecentDisputes] = useState<OrderDispute[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes] = await Promise.all([getWalletOverview(), getWalletTransactions()])
      setWallet(walletRes.wallet)
      setTransactions(txRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载钱包数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleTopup = async () => {
    try {
      const values = await topupForm.validate()
      await topupWallet(Number(values.amount), values.note)
      Toast.success('充值成功')
      topupForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '充值失败')
    }
  }

  const handleCreateDispute = async () => {
    try {
      const values = await disputeForm.validate()
      const res = await createUserOrderDispute(Number(values.order_id), values.reason)
      setRecentDisputes((current) => [res.dispute, ...current].slice(0, 10))
      Toast.success('已提交订单争议')
      disputeForm.reset()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '提交争议失败')
    }
  }

  const latestTransaction = useMemo(() => transactions[0]?.type ?? '—', [transactions])
  const disputeOpenCount = useMemo(() => recentDisputes.filter((item) => item.status === 'open').length, [recentDisputes])

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
          <Tag color="cyan" shape="circle">余额与争议工作台</Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>余额中心</Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              在共享控制台中统一查看可用余额、冻结金额、待结算状态与最近争议处理，让资金观察、充值与售后动作不再依赖额外后台。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconPulse />}>钱包余额与流水来自真实 API 返回</Tag>
            <Tag color="grey" prefixIcon={<IconShield />}>异常订单可直接提交争议并回到管理员链路处理</Tag>
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="可用余额" value={amountLabel(wallet?.available_balance ?? 0)} description="可继续采购与扣费的余额" icon={<IconPulse />} />
        <MetricCard title="冻结余额" value={amountLabel(wallet?.frozen_balance ?? 0)} description="订单执行中暂时冻结的金额" icon={<IconShield />} />
        <MetricCard title="待结算" value={amountLabel(wallet?.pending_settlement ?? 0)} description="关联履约链路、等待进入终态的金额" icon={<IconTickCircle />} />
        <MetricCard title="最近流水 / 争议" value={latestTransaction} description={`最近开放争议：${disputeOpenCount} 条`} icon={<IconAlertTriangle />} />
      </Space>

      <Banner
        type="info"
        fullMode={false}
        description="先在余额中心确认余额与最近流水，再决定是否充值或发起争议；所有资金动作都保留在共享控制台主壳中。"
      />

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={10}>
          <Card title="模拟充值" style={{ width: '100%', borderRadius: 24 }}>
            <Form form={topupForm} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入充值金额' }]} style={{ width: '100%' }} />
              <Form.Input field="note" label="备注" placeholder="在线充值 / 手工补款" />
              <Button type="primary" theme="solid" onClick={handleTopup}>确认充值</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="订单争议申请" style={{ width: '100%', borderRadius: 24 }}>
            <Typography.Paragraph style={{ color: '#475569' }}>
              当订单结果异常、超时或与预期不符时，可直接在共享控制台发起争议；后续管理员会在用户管理页继续处理退款与结算链路。
            </Typography.Paragraph>
            <Form form={disputeForm} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="order_id" label="订单 ID" rules={[{ required: true, message: '请输入订单 ID' }]} style={{ width: '100%' }} />
              <Form.Input field="reason" label="争议原因" rules={[{ required: true, message: '请输入争议原因' }]} />
              <Button type="primary" theme="solid" onClick={handleCreateDispute}>提交争议</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="最近提交的争议" style={{ width: '100%', borderRadius: 24 }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={recentDisputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'open' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
          ]}
        />
      </Card>

      <Card title="钱包流水" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={transactions}
          columns={[
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '方向', dataIndex: 'direction', key: 'direction' },
            { title: '余额类型', dataIndex: 'balance_type', key: 'balance_type' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => amountLabel(Number(value)) },
            { title: '订单', dataIndex: 'order_id', key: 'order_id', render: (value) => value || '—' },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
