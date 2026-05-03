import { Banner, Button, Card, Empty, Form, Modal, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconArticle, IconEdit, IconSafe, IconServer, IconShield, IconTickCircle } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIKeyAuditEntry, APIKeyRecord, createAPIKey, getAPIKeyAudit, getAPIKeys, revokeAPIKey, updateAPIKeyWhitelist } from '../services/apiKeys'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

const PLAINTEXT_VISIBILITY_MS = 5 * 60 * 1000

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

function roleCopy(role?: string) {
  switch (role) {
    case 'admin':
      return {
        badge: '共享控制台 · 管理员扩展',
        title: '开发者 API 接入工作台',
        description: '在同一套共享控制台中继续管理 API Key 生命周期、白名单与审计轨迹，辅助排查限流、白名单拒绝与高危接入动作。',
        tips: ['关注 create / revoke / denied_rate_limit / denied_whitelist 审计轨迹', '为运维联调保留精确 scopes，避免过宽权限'],
      }
    case 'supplier':
      return {
        badge: '共享控制台 · 供应商扩展',
        title: '开发者 API 接入工作台',
        description: '在同一套共享控制台中为供货侧系统配置最小权限 API Key、白名单与调用审计，保持供给链路与共享布局一致。',
        tips: ['优先设置固定出口 IP 白名单，降低供货系统凭证暴露面', '按供货能力拆分不同 scopes，避免跨业务混用'],
      }
    default:
      return {
        badge: '共享控制台 · 基础接入',
        title: '开发者 API 接入工作台',
        description: '完成创建、复制、权限规划与白名单维护，再结合 API 文档与 Webhook 页面打通真实接入链路。',
        tips: ['先创建只读或最小写权限 Key，再逐步扩大 scopes', '创建后立即复制明文 Key；列表里只保留预览值'],
      }
  }
}

function normalizeCSVInput(raw: unknown) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function roleStatLabel(role?: string) {
  switch (role) {
    case 'admin':
      return '需重点排查的接入凭证'
    case 'supplier':
      return '供货系统当前启用凭证'
    default:
      return '当前可用于集成的凭证'
  }
}

function latestAuditLabel(items: APIKeyAuditEntry[]) {
  if (items.length === 0) {
    return '暂无审计记录'
  }
  return items[0].action
}

function latestUsedAt(items: APIKeyRecord[]) {
  let latest = ''
  for (const item of items) {
    if (item.last_used_at && item.last_used_at > latest) {
      latest = item.last_used_at
    }
  }
  return latest || '—'
}

export function ApiKeysPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [items, setItems] = useState<APIKeyRecord[]>([])
  const [audit, setAudit] = useState<APIKeyAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updatingWhitelist, setUpdatingWhitelist] = useState(false)
  const [createdKey, setCreatedKey] = useState<string>('')
  const [createdKeyExpiresAt, setCreatedKeyExpiresAt] = useState<number | null>(null)
  const [revokingID, setRevokingID] = useState<number | null>(null)
  const [editingWhitelistID, setEditingWhitelistID] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [whitelistForm] = Form.useForm<{ whitelist: string }>()

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

  useEffect(() => {
    if (!createdKey || createdKeyExpiresAt === null) {
      return
    }

    const remaining = createdKeyExpiresAt - Date.now()
    if (remaining <= 0) {
      setCreatedKey('')
      setCreatedKeyExpiresAt(null)
      return
    }

    const timer = window.setTimeout(() => {
      setCreatedKey('')
      setCreatedKeyExpiresAt(null)
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [createdKey, createdKeyExpiresAt])

  const copy = useMemo(() => roleCopy(user?.role), [user?.role])
  const activeKeys = useMemo(() => items.filter((item) => item.status === 'active'), [items])
  const revokedKeys = useMemo(() => items.filter((item) => item.status === 'revoked'), [items])
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const canOpenProjects = hasMenuPath(menu, PROJECTS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const whitelistProtectedCount = useMemo(
    () => activeKeys.filter((item) => Array.isArray(item.whitelist) && item.whitelist.length > 0).length,
    [activeKeys],
  )
  const latestUsed = useMemo(() => latestUsedAt(items), [items])

  const handleCreate = async () => {
    try {
      const values = await form.validate()
      const scopes = normalizeCSVInput(values.scopes)
      const whitelist = normalizeCSVInput(values.whitelist)
      setCreating(true)
      const res = await createAPIKey({
        name: String(values.name || '').trim(),
        scopes,
        whitelist,
      })
      setCreatedKey(res.plaintext_key)
      setCreatedKeyExpiresAt(Date.now() + PLAINTEXT_VISIBILITY_MS)
      Toast.success('API Key 已创建，请立即复制明文密钥')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '创建 API Key 失败')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (record: APIKeyRecord) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: `确认撤销 API Key「${record.name}」？`,
        content: '撤销后该 Key 将无法继续访问受保护接口，请确认调用方已完成切换。',
        okText: '确认撤销',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })

    if (!confirmed) {
      return
    }

    try {
      setRevokingID(record.id)
      await revokeAPIKey(record.id)
      Toast.success('API Key 已撤销')
      await load()
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '撤销 API Key 失败')
    } finally {
      setRevokingID(null)
    }
  }

  const openWhitelistEditor = (record: APIKeyRecord) => {
    whitelistForm.setValues({ whitelist: (record.whitelist || []).join(', ') })
    setEditingWhitelistID(record.id)
  }

  const closeWhitelistEditor = () => {
    setEditingWhitelistID(null)
    whitelistForm.reset()
  }

  const handleWhitelistUpdate = async () => {
    if (editingWhitelistID === null) {
      return
    }
    try {
      const values = await whitelistForm.validate()
      const whitelist = normalizeCSVInput(values.whitelist)
      setUpdatingWhitelist(true)
      await updateAPIKeyWhitelist(editingWhitelistID, whitelist)
      Toast.success('API Key 白名单已更新')
      closeWhitelistEditor()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '更新 API Key 白名单失败')
    } finally {
      setUpdatingWhitelist(false)
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.16) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">
            {copy.badge}
          </Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>
              {copy.title}
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              {copy.description}
            </Typography.Paragraph>
          </div>
          <Space wrap>
            {copy.tips.map((tip) => (
              <Tag key={tip} color="grey" prefixIcon={<IconSafe />}>
                {tip}
              </Tag>
            ))}
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="活跃 Key" value={String(activeKeys.length)} description={roleStatLabel(user?.role)} icon={<IconTickCircle />} />
        <MetricCard title="已撤销" value={String(revokedKeys.length)} description="可追溯但不可继续调用" icon={<IconShield />} />
        <MetricCard title="白名单保护" value={String(whitelistProtectedCount)} description="已绑定出口 IP / CIDR 的活跃 Key" icon={<IconServer />} />
        <MetricCard title="最近使用" value={latestUsed} description={`最近审计动作：${latestAuditLabel(audit)}`} icon={<IconArticle />} wide />
      </Space>

      <Banner
        type="info"
        fullMode={false}
        description="新建后仅展示一次明文密钥，请立即复制保存；后续列表仅显示 key_preview。若需要程序化回调，请继续前往 Webhook 设置与 API 文档。"
      />

      <Card
        style={{
          width: '100%',
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.94) 56%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(125,211,252,0.16)',
        }}
        bodyStyle={{ padding: 22 }}
      >
        <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">共享接入回退路径</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={4} style={{ margin: '0 0 8px', color: '#f7f8f8' }}>
                API Keys → Webhook → 文档
              </Typography.Title>
              <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.78)', maxWidth: 760 }}>
                保持共享控制台中的接入顺序：先发放最小权限密钥，再继续回调联调与文档核对；如果当前角色未暴露这些入口，则回到推荐工作台继续真实业务主链路。
              </Typography.Paragraph>
            </div>
            <Space wrap>
              {canOpenProjects ? (
                <Button theme="borderless" type="primary" icon={<IconServer />} onClick={() => navigate(PROJECTS_ROUTE)}>
                  返回项目市场
                </Button>
              ) : null}
              {canOpenWebhooks ? (
                <Button type="primary" theme="solid" icon={<IconArticle />} onClick={() => navigate(WEBHOOKS_ROUTE)}>
                  继续配置 Webhook
                </Button>
              ) : null}
              {canOpenDocs ? (
                <Button theme="light" type="primary" icon={<IconSafe />} onClick={() => navigate(DOCS_ROUTE)}>
                  查看 API 文档
                </Button>
              ) : null}
              {!canOpenProjects && !canOpenWebhooks && !canOpenDocs && fallbackRoute !== API_KEYS_ROUTE ? (
                <Space
                  data-testid="api-keys-shared-console-fallback"
                  vertical
                  align="start"
                  spacing={10}
                  style={{
                    width: '100%',
                    padding: 18,
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(148,163,184,0.16)',
                  }}
                >
                  <Typography.Text strong style={{ color: '#f8fafc' }}>返回推荐工作台</Typography.Text>
                  <Typography.Text style={{ color: 'rgba(203,213,225,0.74)' }}>
                    当 Webhook、文档与项目入口暂未由服务端暴露时，先回到推荐工作台继续共享控制台中的真实业务主链路。
                  </Typography.Text>
                  <Button theme="solid" type="primary" icon={<IconServer />} onClick={() => navigate(fallbackRoute)}>
                    返回推荐工作台
                  </Button>
                </Space>
              ) : null}
            </Space>
          </Space>
        </Space>
      </Card>

      {createdKey ? (
        <Banner
          type="success"
          fullMode={false}
          closeIcon={null}
          description={`本次创建的明文 Key：${createdKey}`}
          actions={
            <Space>
              <Button
                theme="light"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdKey)
                    Toast.success('明文 API Key 已复制')
                    setCreatedKey('')
                    setCreatedKeyExpiresAt(null)
                  } catch {
                    Toast.error('复制失败，请手动复制后关闭')
                  }
                }}
              >
                复制并隐藏
              </Button>
              {canOpenWebhooks ? (
                <Button theme="solid" type="primary" onClick={() => navigate(WEBHOOKS_ROUTE)}>
                  继续配置 Webhook
                </Button>
              ) : null}
              {canOpenDocs ? (
                <Button theme="borderless" type="primary" onClick={() => navigate(DOCS_ROUTE)}>
                  查看 API 文档
                </Button>
              ) : null}
              <Button
                theme="borderless"
                onClick={() => {
                  setCreatedKey('')
                  setCreatedKeyExpiresAt(null)
                }}
              >
                关闭
              </Button>
            </Space>
          }
        />
      ) : null}

      <Card title="创建 API Key" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.Input field="name" label="名称" rules={[{ required: true, message: '请输入名称' }]} />
          <Form.Input field="scopes" label="权限范围" placeholder="activation:read, finance:write" />
          <Form.Input field="whitelist" label="IP 白名单" placeholder="127.0.0.1,10.0.0.0/24" />
          <Button type="primary" theme="solid" loading={creating} onClick={handleCreate}>
            创建新密钥
          </Button>
        </Form>
      </Card>

      <Card title="当前密钥" style={{ width: '100%' }} loading={loading}>
        {items.length === 0 ? (
          <Empty description="暂无 API Key，先创建第一个凭证完成接入。">
            <Space>
              {canOpenWebhooks ? (
                <Button type="primary" theme="solid" onClick={() => navigate(WEBHOOKS_ROUTE)}>
                  前往 Webhook 设置
                </Button>
              ) : null}
              {canOpenDocs ? (
                <Button theme="borderless" type="primary" onClick={() => navigate(DOCS_ROUTE)}>
                  查看 API 文档
                </Button>
              ) : null}
              {fallbackRoute !== API_KEYS_ROUTE ? (
                <Button theme="borderless" type="tertiary" onClick={() => navigate(fallbackRoute)}>
                  返回推荐工作台
                </Button>
              ) : null}
            </Space>
          </Empty>
        ) : (
          <Table
            pagination={false}
            dataSource={items}
            rowKey="id"
            columns={[
              { title: '名称', dataIndex: 'name', key: 'name' },
              { title: 'Key 预览', dataIndex: 'key_preview', key: 'key_preview' },
              {
                title: '权限范围',
                dataIndex: 'scopes',
                key: 'scopes',
                render: (value) =>
                  Array.isArray(value) && value.length > 0 ? (
                    <Space wrap>
                      {value.map((scope: string) => (
                        <Tag key={scope} color="cyan">
                          {scope}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    '—'
                  ),
              },
              {
                title: 'IP 白名单',
                dataIndex: 'whitelist',
                key: 'whitelist',
                render: (value) =>
                  Array.isArray(value) && value.length > 0 ? (
                    <Space wrap>
                      {value.map((item: string) => (
                        <Tag key={item} color="grey">
                          {item}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Tag color="blue">未限制</Tag>
                  ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (value) => <Tag color={statusColor(String(value))}>{String(value)}</Tag>,
              },
              { title: '最近使用', dataIndex: 'last_used_at', key: 'last_used_at', render: (value) => value || '—' },
              {
                title: '操作',
                key: 'action',
                render: (_, record: APIKeyRecord) => (
                  <Space>
                    <Button
                      disabled={record.status !== 'active'}
                      icon={<IconEdit />}
                      theme="borderless"
                      onClick={() => openWhitelistEditor(record)}
                    >
                      编辑白名单
                    </Button>
                    <Button
                      disabled={record.status !== 'active'}
                      loading={revokingID === record.id}
                      theme="borderless"
                      type="danger"
                      onClick={() => void handleRevoke(record)}
                    >
                      撤销
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title="编辑 API Key 白名单" style={{ width: '100%', borderRadius: 20, display: editingWhitelistID !== null ? 'block' : 'none' }}>
        <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
          <Typography.Paragraph style={{ margin: 0, color: '#475569' }}>
            请输入合法的 IP 或 CIDR，使用英文逗号分隔。留空表示移除白名单限制。
          </Typography.Paragraph>
          <Form form={whitelistForm} layout="vertical" style={{ width: '100%' }}>
            <Form.Input
              field="whitelist"
              label="IP 白名单"
              placeholder="172.18.0.1,10.0.0.0/24"
            />
          </Form>
          <Space>
            <Button theme="solid" type="primary" loading={updatingWhitelist} onClick={() => void handleWhitelistUpdate()}>
              保存白名单
            </Button>
            <Button theme="borderless" onClick={closeWhitelistEditor}>取消</Button>
          </Space>
        </Space>
      </Card>

      <Card title="审计日志" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          dataSource={audit}
          rowKey="id"
          columns={[
            { title: '时间', dataIndex: 'created_at', key: 'created_at' },
            { title: '动作', dataIndex: 'action', key: 'action' },
            { title: '主体', dataIndex: 'actor_type', key: 'actor_type' },
            { title: '备注', dataIndex: 'note', key: 'note', render: (value) => value || '—' },
          ]}
        />
      </Card>
    </Space>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon,
  wide,
}: {
  title: string
  value: string
  description: string
  icon: JSX.Element
  wide?: boolean
}) {
  return (
    <Card
      style={{
        flex: wide ? '1 1 320px' : '1 1 220px',
        minWidth: wide ? 320 : 220,
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
