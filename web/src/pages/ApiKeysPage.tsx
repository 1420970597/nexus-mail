import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { APIKeyAuditEntry, APIKeyRecord, createAPIKey, getAPIKeyAudit, getAPIKeys, revokeAPIKey } from '../services/apiKeys'

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'green'
    case 'revoked':
      return 'red'
    default:
      return 'grey'
  }
}

export function ApiKeysPage() {
  const [items, setItems] = useState<APIKeyRecord[]>([])
  const [audit, setAudit] = useState<APIKeyAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [createdKey, setCreatedKey] = useState<string>('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [keyRes, auditRes] = await Promise.all([getAPIKeys(), getAPIKeyAudit()])
      setItems(keyRes.items)
      setAudit(auditRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载 API Key 数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validate()
      const scopes = String(values.scopes || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      const whitelist = String(values.whitelist || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      const res = await createAPIKey({
        name: values.name,
        scopes,
        whitelist,
      })
      setCreatedKey(res.plaintext_key)
      Toast.success('API Key 已创建')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '创建 API Key 失败')
    }
  }

  const handleRevoke = async (id: number) => {
    try {
      await revokeAPIKey(id)
      Toast.success('API Key 已撤销')
      await load()
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '撤销 API Key 失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>API Keys</Typography.Title>
        <Typography.Paragraph>管理对外 API 密钥、权限范围和 IP 白名单，完成 Phase 5 第一批交付。</Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="新建后仅展示一次明文密钥，请立即复制保存；后续页面仅显示预览值。"
      />

      {createdKey ? (
        <Banner type="success" fullMode={false} description={`本次创建的明文 Key：${createdKey}`} />
      ) : null}

      <Card title="创建 API Key" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.Input field="name" label="名称" rules={[{ required: true, message: '请输入名称' }]} />
          <Form.Input field="scopes" label="权限范围" placeholder="activation:read, finance:write" />
          <Form.Input field="whitelist" label="IP 白名单" placeholder="127.0.0.1,10.0.0.0/24" />
          <Button type="primary" theme="solid" onClick={handleCreate}>创建新密钥</Button>
        </Form>
      </Card>

      <Card title="当前密钥" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          dataSource={items}
          rowKey="id"
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: 'Key 预览', dataIndex: 'key_preview', key: 'key_preview' },
            { title: '权限范围', dataIndex: 'scopes', key: 'scopes', render: (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : '—') },
            { title: 'IP 白名单', dataIndex: 'whitelist', key: 'whitelist', render: (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : '未限制') },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={statusColor(String(value))}>{String(value)}</Tag> },
            { title: '最近使用', dataIndex: 'last_used_at', key: 'last_used_at', render: (value) => value || '—' },
            {
              title: '操作',
              key: 'action',
              render: (_, record: APIKeyRecord) => (
                <Button disabled={record.status !== 'active'} theme="borderless" type="danger" onClick={() => void handleRevoke(record.id)}>
                  撤销
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card title="审计日志" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          dataSource={audit}
          rowKey="id"
          columns={[
            { title: '审计 ID', dataIndex: 'id', key: 'id' },
            { title: '动作', dataIndex: 'action', key: 'action' },
            { title: '主体', dataIndex: 'actor_type', key: 'actor_type' },
            { title: '说明', dataIndex: 'note', key: 'note' },
            { title: '时间', dataIndex: 'created_at', key: 'created_at' },
          ]}
        />
      </Card>
    </Space>
  )
}
