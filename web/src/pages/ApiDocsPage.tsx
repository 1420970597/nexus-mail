import { Card, Typography } from '@douyinfe/semi-ui'

export function ApiDocsPage() {
  return (
    <Card style={{ width: '100%', padding: 0, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '20px 24px 0 24px' }}>
        <Typography.Title heading={3}>API 文档</Typography.Title>
        <Typography.Paragraph>
          当前页面已接入 Phase 5 初始版 OpenAPI + Redoc，可直接查看认证、订单、供应商资源与账务接口。
        </Typography.Paragraph>
      </div>
      <iframe
        title="nexus-mail-api-docs"
        src="/openapi/index.html"
        style={{ width: '100%', minHeight: '80vh', border: 'none' }}
      />
    </Card>
  )
}
