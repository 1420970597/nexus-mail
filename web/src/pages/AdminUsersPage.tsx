import { Button, Card, Form, Space, Table, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { adminAdjustWallet, getAdminWalletUsers, WalletOverview } from '../services/finance'

export function AdminUsersPage() {
  const [items, setItems] = useState<WalletOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAdminWalletUsers()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

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

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>用户管理</Typography.Title>
        <Typography.Paragraph>管理员可查看钱包余额并执行手工调账。</Typography.Paragraph>
      </div>
      <Card title="管理员调账" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="user_id" label="用户 ID" rules={[{ required: true, message: '请输入用户 ID' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入调账金额' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="原因" rules={[{ required: true, message: '请输入调账原因' }]} />
          <Button type="primary" theme="solid" onClick={handleAdjust}>执行调账</Button>
        </Form>
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
