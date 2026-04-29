import { Banner, Button, Card, Col, Row, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const preferenceOptions = [
  {
    key: 'notify',
    title: '订单通知',
    description: '在订单 READY、超时和争议状态变更时优先提醒，帮助你在统一控制台内快速回到关键操作。',
    accent: 'rgba(59,130,246,0.16)',
  },
  {
    key: 'webhook',
    title: 'Webhook 回调提醒',
    description: '为 API Key / Webhook 接入用户保留统一偏好入口；真实 endpoint 管理与投递观测仍在 Webhook 设置页完成。',
    accent: 'rgba(16,185,129,0.16)',
  },
  {
    key: 'risk',
    title: '风险摘要提示',
    description: '管理员可在进入控制台时优先查看高风险信号、白名单拦截与限流事件，减少跨页排查成本。',
    accent: 'rgba(249,115,22,0.16)',
  },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const roleScene = useMemo(() => {
    switch (user?.role) {
      case 'admin':
        return {
          label: '管理员工作台',
          description: '优先处理结算、争议、风控与审计链路，确保共享控制台中的高危动作具备统一入口。',
          tags: ['风控中心', '审计日志', '供应商运营'],
        }
      case 'supplier':
        return {
          label: '供应商工作台',
          description: '围绕域名池、资源供给、供货规则与结算报表组织日常操作，保持单一壳体验。',
          tags: ['域名管理', '供应商资源', '供应商结算'],
        }
      default:
        return {
          label: '用户工作台',
          description: '聚焦项目下单、订单轮询、API Key 与回调接入，让采购与集成在同一控制台内完成。',
          tags: ['项目市场', '订单中心', 'API Keys'],
        }
    }
  }, [user?.role])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>设置中心</Typography.Title>
        <Typography.Paragraph>
          这里不再承载“假保存”表单，而是明确展示共享控制台的偏好分区、角色工作台重点与后续将接入的真实安全策略入口。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="当前阶段已接入登录、登出与 refresh token 轮换；本页优先呈现统一控制台的偏好分区说明与工作台指引，不展示会误导用户的假保存交互。"
        style={{ width: '100%' }}
      />

      <Card title="当前角色工作台" style={{ width: '100%' }}>
        <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
          <Typography.Title heading={5} style={{ margin: 0 }}>{roleScene.label}</Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>{roleScene.description}</Typography.Paragraph>
          <Space wrap>
            {roleScene.tags.map((tag) => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
          </Space>
        </Space>
      </Card>

      <Row gutter={16} style={{ width: '100%' }}>
        {preferenceOptions.map((item) => (
          <Col xs={24} md={12} xl={8} key={item.key}>
            <Card
              style={{
                height: '100%',
                borderRadius: 20,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
                border: `1px solid ${item.accent}`,
                boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Typography.Title heading={5} style={{ margin: 0 }}>{item.title}</Typography.Title>
                  <Tag color="grey">规划中</Tag>
                </Space>
                <Typography.Paragraph style={{ margin: 0, color: '#475569' }}>{item.description}</Typography.Paragraph>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="后续真实安全策略入口" style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="cyan">会话保活 / 退出登录</Tag>
          <Tag color="purple">API Key / 白名单 / 限流</Tag>
          <Tag color="green">Webhook 回调偏好</Tag>
          <Tag color="orange">风险规则与告警摘要</Tag>
        </Space>
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="tertiary">
            当后端提供明确的偏好保存契约后，本页再演进为真实保存表单；当前优先保证信息架构和单一控制台体验完整，而不是展示无落点设置项。
          </Typography.Text>
        </div>
      </Card>

      <Card title="快捷入口" style={{ width: '100%' }}>
        <Space wrap>
          <Button theme="solid" type="primary" onClick={() => navigate('/profile')}>查看个人资料</Button>
          <Button onClick={() => navigate('/api-keys')}>管理 API Keys</Button>
          <Button onClick={() => navigate('/docs')}>查看 API 文档</Button>
        </Space>
      </Card>
    </Space>
  )
}
