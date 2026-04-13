import { useState } from 'react'
import { Button, Card, Form, Typography } from '@douyinfe/semi-ui'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/auth'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError('')
    try {
      const session = await login(values.email, values.password)
      setSession(session.token, session.refresh_token, session.user)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Card style={{ width: 420 }}>
        <Typography.Title heading={3}>登录 Nexus-Mail</Typography.Title>
        {import.meta.env.DEV ? (
          <Typography.Paragraph>
            开发环境预置账号：admin@nexus-mail.local / Admin123!，supplier@nexus-mail.local / Supplier123!，user@nexus-mail.local / User123!
          </Typography.Paragraph>
        ) : null}
        <Form onSubmit={onSubmit}>
          <Form.Input field="email" label="邮箱" rules={[{ required: true }]} />
          <Form.Input field="password" label="密码" mode="password" rules={[{ required: true }]} />
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          <Button htmlType="submit" theme="solid" type="primary" loading={loading} style={{ marginTop: 12, width: '100%' }}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}
