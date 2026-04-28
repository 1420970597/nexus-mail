import { Banner, Button, Card, Checkbox, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import {
  SupplierAccount,
  SupplierDomain,
  SupplierMailbox,
  createSupplierAccount,
  createSupplierDomain,
  createSupplierMailbox,
  getSupplierResourcesOverview,
} from '../services/activation'

interface ResourceState {
  domains: SupplierDomain[]
  mailboxes: SupplierMailbox[]
  accounts: SupplierAccount[]
}

export function SupplierResourcesPage() {
  const [data, setData] = useState<ResourceState>({ domains: [], mailboxes: [], accounts: [] })
  const [loading, setLoading] = useState(false)
  const [domainForm] = Form.useForm()
  const [accountForm] = Form.useForm()
  const [mailboxForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSupplierResourcesOverview()
      setData(res)
    } catch {
      setData({ domains: [], mailboxes: [], accounts: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const submitDomain = async () => {
    try {
      const values = await domainForm.validate()
      await createSupplierDomain({
        name: values.name,
        region: values.region,
        catch_all: Boolean(values.catch_all),
        status: values.status,
      })
      Toast.success('域名池已新增')
      domainForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增域名失败')
    }
  }

  const submitAccount = async () => {
    try {
      const values = await accountForm.validate()
      await createSupplierAccount({
        provider: values.provider,
        source_type: values.source_type,
        auth_mode: values.auth_mode,
        protocol_mode: values.protocol_mode,
        identifier: values.identifier,
        status: values.status,
        host: values.host,
        port: values.port ? Number(values.port) : undefined,
        refresh_token: values.refresh_token,
        credential_secret: values.credential_secret,
        secret_ref: values.secret_ref,
        bridge_endpoint: values.bridge_endpoint,
        bridge_label: values.bridge_label,
      })
      Toast.success('第三方邮箱账号已新增')
      accountForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增账号失败')
    }
  }

  const submitMailbox = async () => {
    try {
      const values = await mailboxForm.validate()
      await createSupplierMailbox({
        domain_id: values.domain_id ? Number(values.domain_id) : undefined,
        account_id: values.account_id ? Number(values.account_id) : undefined,
        local_part: values.local_part,
        address: values.address,
        source_type: values.source_type,
        project_key: values.project_key,
        status: values.status,
      })
      Toast.success('邮箱池记录已新增')
      mailboxForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '新增邮箱失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供应商资源</Typography.Title>
        <Typography.Paragraph>
          统一展示并录入供应商的域名池、邮箱池与第三方邮箱账号池，覆盖自建域名和主流公网邮箱两类供货来源。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="当前页面对应 todo Phase 3 资源接入收尾：已支持 OAuth2 / 授权码 / App Password / Proton Bridge 所需的主机、端口、refresh token 与 bridge 配置录入。"
      />

      <Card title="新增域名池" style={{ width: '100%' }} loading={loading}>
        <Form form={domainForm} layout="horizontal" labelPosition="left">
          <Form.Input field="name" label="域名" rules={[{ required: true, message: '请输入域名' }]} placeholder="mail.nexus.example" />
          <Form.Input field="region" label="区域" initValue="global" />
          <Form.Input field="status" label="状态" initValue="active" />
          <Form.Slot label="Catch-All">
            <Checkbox defaultChecked onChange={(checked) => domainForm.setValue('catch_all', checked.target.checked)}>启用 Catch-All</Checkbox>
          </Form.Slot>
          <Button theme="solid" type="primary" onClick={submitDomain}>保存域名</Button>
        </Form>
      </Card>

      <Card title="新增第三方邮箱账号" style={{ width: '100%' }} loading={loading}>
        <Form form={accountForm} layout="horizontal" labelPosition="left" initValues={{ source_type: 'public_mailbox_account', auth_mode: 'oauth2', protocol_mode: 'imap_pull', status: 'active' }}>
          <Form.Input field="provider" label="Provider" rules={[{ required: true, message: '请输入 provider' }]} placeholder="outlook / gmail / qq / proton" />
          <Form.Input field="identifier" label="账号标识" rules={[{ required: true, message: '请输入邮箱或账号标识' }]} placeholder="supplier@example.com" />
          <Form.Input field="source_type" label="来源类型" />
          <Form.Input field="auth_mode" label="认证方式" />
          <Form.Input field="protocol_mode" label="协议模式" />
          <Form.Input field="host" label="主机" placeholder="imap.gmail.com / 127.0.0.1" />
          <Form.InputNumber field="port" label="端口" placeholder="993 / 995 / 1143" style={{ width: '100%' }} />
          <Form.Input field="refresh_token" label="Refresh Token" placeholder="OAuth2 必填，授权码/App Password 可留空" />
          <Form.Input field="credential_secret" label="凭证密文" placeholder="App Password / 授权码 / Bridge 密码" />
          <Form.Input field="secret_ref" label="Secret Ref" placeholder="env://NEXUS_QQ_AUTH_CODE" />
          <Form.Input field="bridge_endpoint" label="Bridge Endpoint" placeholder="127.0.0.1:1143" />
          <Form.Input field="bridge_label" label="Bridge Label" placeholder="proton-bridge" />
          <Form.Input field="status" label="状态" />
          <Button theme="solid" type="primary" onClick={submitAccount}>保存账号</Button>
        </Form>
      </Card>

      <Card title="新增邮箱池 / 别名池记录" style={{ width: '100%' }} loading={loading}>
        <Form form={mailboxForm} layout="horizontal" labelPosition="left" initValues={{ source_type: 'self_hosted_domain', status: 'available' }}>
          <Form.Input field="project_key" label="项目键" rules={[{ required: true, message: '请输入项目键' }]} placeholder="openai" />
          <Form.Input field="domain_id" label="域名 ID" placeholder="可选，与 account_id 至少填一项" />
          <Form.Input field="account_id" label="账号 ID" placeholder="可选，与 domain_id 至少填一项" />
          <Form.Input field="local_part" label="local part" placeholder="agent-001" />
          <Form.Input field="address" label="完整地址" placeholder="可直接录完整邮箱" />
          <Form.Input field="source_type" label="来源类型" />
          <Form.Input field="status" label="状态" />
          <Button theme="solid" type="primary" onClick={submitMailbox}>保存邮箱</Button>
        </Form>
      </Card>

      <Card title="域名池" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.domains}
          columns={[
            { title: '域名', dataIndex: 'name', key: 'name' },
            { title: '区域', dataIndex: 'region', key: 'region' },
            { title: 'Catch-All', dataIndex: 'catch_all', key: 'catch_all', render: (value) => <Tag color={value ? 'green' : 'grey'}>{value ? '是' : '否'}</Tag> },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="blue">{String(value)}</Tag> },
          ]}
        />
      </Card>

      <Card title="邮箱池 / 别名池" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.mailboxes}
          columns={[
            { title: '邮箱地址', dataIndex: 'address', key: 'address' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
            { title: '项目', dataIndex: 'project_key', key: 'project_key' },
            { title: 'Provider', dataIndex: 'provider', key: 'provider', render: (value) => value || '自建域名' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="purple">{String(value)}</Tag> },
          ]}
        />
      </Card>

      <Card title="第三方邮箱账号池" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.accounts}
          columns={[
            { title: 'Provider', dataIndex: 'provider', key: 'provider' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
            { title: '认证方式', dataIndex: 'auth_mode', key: 'auth_mode' },
            { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode' },
            { title: '标识', dataIndex: 'identifier', key: 'identifier' },
            { title: '主机', dataIndex: 'host', key: 'host', render: (value, record) => value ? `${value}:${record.port ?? ''}` : '-' },
            { title: 'Secret Ref', dataIndex: 'secret_ref', key: 'secret_ref', render: (value) => value || '-' },
            { title: '健康状态', dataIndex: 'health_status', key: 'health_status', render: (value) => <Tag color={value === 'healthy' ? 'green' : 'red'}>{String(value || 'unknown')}</Tag> },
            { title: 'Bridge', dataIndex: 'bridge_endpoint', key: 'bridge_endpoint', render: (value) => value || '-' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="orange">{String(value)}</Tag> },
          ]}
        />
      </Card>
    </Space>
  )
}
