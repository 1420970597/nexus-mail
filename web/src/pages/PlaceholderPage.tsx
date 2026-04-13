import { Banner, Card, Typography } from '@douyinfe/semi-ui'

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <Typography.Title heading={3}>{title}</Typography.Title>
      <Banner type="info" fullMode={false} description={description} style={{ marginBottom: 16 }} />
      <Card>{description}</Card>
    </div>
  )
}
