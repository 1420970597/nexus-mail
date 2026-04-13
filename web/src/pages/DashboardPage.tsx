import { Banner, Card, Col, Row, Typography } from '@douyinfe/semi-ui'

export function DashboardPage() {
  return (
    <div>
      <Banner
        fullMode={false}
        type="info"
        title="Nexus-Mail 开发骨架已启动"
        description="当前阶段已完成 Go + React + Docker 的项目基础骨架初始化。"
        style={{ marginBottom: 16 }}
      />
      <Typography.Title heading={3}>项目概览</Typography.Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="后端">Go + Gin + PostgreSQL + Redis + RabbitMQ</Card>
        </Col>
        <Col span={8}>
          <Card title="前端">React + Vite + TypeScript + Semi Design</Card>
        </Col>
        <Col span={8}>
          <Card title="部署">Docker + Compose + Caddy + Postfix(规划)</Card>
        </Col>
      </Row>
    </div>
  )
}
