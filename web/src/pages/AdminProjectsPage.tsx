import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { InventoryItem, ProjectItem, getAdminProjectOfferings, getAdminProjects, updateAdminProject } from '../services/activation'

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [offerings, setOfferings] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [projectsRes, offeringsRes] = await Promise.all([getAdminProjects(), getAdminProjectOfferings()])
      setProjects(projectsRes.items)
      setOfferings(offeringsRes.items)
      if (projectsRes.items.length > 0) {
        const target = selectedId ? projectsRes.items.find((item) => item.id === selectedId) ?? projectsRes.items[0] : projectsRes.items[0]
        setSelectedId(target.id)
        form.setValues({
          name: target.name,
          description: target.description,
          default_price: target.default_price,
          success_rate: target.success_rate,
          timeout_seconds: target.timeout_seconds,
          is_active: target.is_active ?? true,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedProject = useMemo(() => projects.find((item) => item.id === selectedId) ?? null, [projects, selectedId])

  const handleSelect = (project: ProjectItem) => {
    setSelectedId(project.id)
    form.setValues({
      name: project.name,
      description: project.description,
      default_price: project.default_price,
      success_rate: project.success_rate,
      timeout_seconds: project.timeout_seconds,
      is_active: project.is_active ?? true,
    })
  }

  const handleSave = async () => {
    if (!selectedProject) {
      return
    }
    try {
      const values = await form.validate()
      setSaving(true)
      await updateAdminProject(selectedProject.id, {
        name: values.name,
        description: values.description,
        default_price: Number(values.default_price),
        success_rate: Number(values.success_rate),
        timeout_seconds: Number(values.timeout_seconds),
        is_active: Boolean(values.is_active),
      })
      Toast.success(`项目 ${selectedProject.key} 配置已更新`)
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '更新项目失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>管理员项目配置</Typography.Title>
        <Typography.Paragraph>维护项目基础属性，并同步查看项目在不同域名池/供应商下的库存与价格映射。</Typography.Paragraph>
      </div>

      <Banner type="info" fullMode={false} description="当前页面对应 todo Phase 2 第 11 项：管理员项目配置页面。已支持项目列表、属性编辑与供应商报价映射查看。" />

      <Card title="项目列表" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={projects}
          columns={[
            { title: '项目键', dataIndex: 'key', key: 'key', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '项目名称', dataIndex: 'name', key: 'name' },
            { title: '默认价', dataIndex: 'default_price', key: 'default_price', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${Math.round(Number(value) * 100)}%` },
            { title: '超时', dataIndex: 'timeout_seconds', key: 'timeout_seconds', render: (value) => `${value}s` },
            { title: '状态', dataIndex: 'is_active', key: 'is_active', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? '启用' : '停用'}</Tag> },
            { title: '操作', key: 'action', render: (_, record) => <Button theme="light" onClick={() => handleSelect(record)}>编辑</Button> },
          ]}
        />
      </Card>

      <Card title={selectedProject ? `编辑项目 · ${selectedProject.key}` : '编辑项目'} style={{ width: '100%' }} loading={loading}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.Input field="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]} />
          <Form.Input field="description" label="项目描述" />
          <Form.InputNumber field="default_price" label="默认价格（分）" rules={[{ required: true, message: '请输入默认价格' }]} min={0} />
          <Form.InputNumber field="success_rate" label="成功率" rules={[{ required: true, message: '请输入成功率' }]} min={0} max={1} step={0.01} />
          <Form.InputNumber field="timeout_seconds" label="超时时间（秒）" rules={[{ required: true, message: '请输入超时秒数' }]} min={1} />
          <Form.Switch field="is_active" label="启用状态" />
          <Button type="primary" theme="solid" loading={saving} disabled={!selectedProject} onClick={handleSave}>保存配置</Button>
        </Form>
      </Card>

      <Card title="供应商报价 / 库存映射" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey={(record?: InventoryItem) => `${record?.project_key ?? 'unknown'}-${record?.domain_id ?? 0}`}
          dataSource={selectedProject ? offerings.filter((item) => item.project_id === selectedProject.id) : offerings}
          columns={[
            { title: '项目', dataIndex: 'project_name', key: 'project_name' },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '供应商 ID', dataIndex: 'supplier_id', key: 'supplier_id' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
            { title: '价格', dataIndex: 'price', key: 'price', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '库存', dataIndex: 'stock', key: 'stock' },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${Math.round(Number(value) * 100)}%` },
          ]}
        />
      </Card>
    </Space>
  )
}
