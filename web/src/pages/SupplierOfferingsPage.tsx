import { Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getSupplierOfferings, getSupplierResourcesOverview, InventoryItem, saveSupplierOffering, SupplierDomain } from '../services/activation'

function money(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

export function SupplierOfferingsPage() {
  const [domains, setDomains] = useState<SupplierDomain[]>([])
  const [offerings, setOfferings] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [resourcesRes, offeringsRes] = await Promise.all([getSupplierResourcesOverview(), getSupplierOfferings()])
      setDomains(resourcesRes.domains)
      setOfferings(offeringsRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载供货规则失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSave = async () => {
    try {
      const values = await form.validate()
      await saveSupplierOffering({
        project_key: values.project_key,
        domain_id: Number(values.domain_id),
        price: Number(values.price),
        success_rate: Number(values.success_rate),
        priority: Number(values.priority ?? 0),
        source_type: values.source_type,
        protocol_mode: values.protocol_mode,
      })
      Toast.success('供货规则已保存')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '保存供货规则失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供货规则</Typography.Title>
        <Typography.Paragraph>
          供应商可按项目、域名池与来源类型维护可售规则，价格、优先级与成功率会直接影响用户下单库存与分配路径。
        </Typography.Paragraph>
      </div>

      <Card title="新增 / 更新供货规则" style={{ width: '100%' }} loading={loading}>
        <Form form={form} layout="horizontal" labelPosition="left" initValues={{ source_type: 'domain', protocol_mode: '', success_rate: 0.95, priority: 10 }}>
          <Form.Input field="project_key" label="项目键" rules={[{ required: true, message: '请输入项目键' }]} placeholder="discord" />
          <Form.Select
            field="domain_id"
            label="域名池"
            rules={[{ required: true, message: '请选择域名池' }]}
            optionList={domains.map((domain) => ({ label: `${domain.name} (#${domain.id})`, value: domain.id }))}
          />
          <Form.InputNumber field="price" label="售价（分）" min={0} rules={[{ required: true, message: '请输入售价' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="success_rate" label="预估成功率" min={0} max={1} step={0.01} rules={[{ required: true, message: '请输入成功率' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="priority" label="分配优先级" min={0} style={{ width: '100%' }} />
          <Form.Select
            field="source_type"
            label="来源类型"
            optionList={[
              { label: '自建域名/域名池', value: 'domain' },
              { label: 'Public Mailbox', value: 'public_mailbox_account' },
              { label: 'Hosted Mailbox', value: 'hosted_mailbox' },
              { label: 'Bridge Mailbox', value: 'bridge_mailbox' },
            ]}
          />
          <Form.Input field="protocol_mode" label="协议模式" placeholder="imap_pull / pop3_pull，可留空" />
          <Button type="primary" theme="solid" onClick={handleSave}>保存供货规则</Button>
        </Form>
      </Card>

      <Card title="当前可售规则" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={offerings}
          columns={[
            { title: '项目', dataIndex: 'project_key', key: 'project_key' },
            { title: '项目名称', dataIndex: 'project_name', key: 'project_name' },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '售价', dataIndex: 'price', key: 'price', render: (value) => money(Number(value)) },
            { title: '库存', dataIndex: 'stock', key: 'stock' },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${(Number(value) * 100).toFixed(1)}%` },
            { title: '优先级', dataIndex: 'priority', key: 'priority' },
            { title: '来源', dataIndex: 'source_type', key: 'source_type', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode', render: (value) => value || '—' },
          ]}
        />
      </Card>
    </Space>
  )
}
