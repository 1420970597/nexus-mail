import { Banner, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, PROJECTS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

interface FocusAction {
  label: string
  path: string
  buttonText: string
}

interface FocusItem {
  title: string
  description: string
}

function roleColor(role?: string) {
  switch (role) {
    case 'admin':
      return 'red'
    case 'supplier':
      return 'green'
    default:
      return 'blue'
  }
}

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'supplier':
      return '供应商'
    default:
      return '用户'
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const canOpenProjects = hasMenuPath(menu, PROJECTS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenSupplierDomains = hasMenuPath(menu, '/supplier/domains')
  const canOpenAdminRisk = hasMenuPath(menu, '/admin/risk')

  const profileScene = useMemo(() => {
    switch (user?.role) {
      case 'admin': {
        const actionPath = canOpenAdminRisk ? '/admin/risk' : fallbackRoute
        return {
          title: '管理员运营焦点',
          summary: '集中关注风控、审计、供应商运营与价格策略，让高危动作在单一共享控制台内闭环。',
          action: { label: '进入风控中心', path: actionPath, buttonText: '前往风控中心' },
          focuses: [
            { title: '风控与审计联动', description: '结合风险规则、审计日志与 API Key 事件，快速确认异常访问、限流与白名单拦截。' },
            { title: '供应商经营摘要', description: '从共享壳直接进入供应商管理、待结算排行与争议处理，不再依赖独立后台切换。' },
          ],
        }
      }
      case 'supplier': {
        const actionPath = canOpenSupplierDomains ? '/supplier/domains' : fallbackRoute
        return {
          title: '供应商运营焦点',
          summary: '围绕域名池、资源供给、供货规则与结算报表组织日常动作，确保供货运营与财务视角一致。',
          action: { label: '进入域名管理', path: actionPath, buttonText: '前往域名管理' },
          focuses: [
            { title: '域名与资源健康', description: '维护域名池、邮箱账号与协议状态，确保库存、成功率和可售性同步更新。' },
            { title: '供货策略闭环', description: '从供货规则到结算报表形成闭环，及时调整售价、成功率与优先级。' },
          ],
        }
      }
      default: {
        const actionPath = canOpenProjects ? PROJECTS_ROUTE : fallbackRoute
        return {
          title: '用户接入焦点',
          summary: '在同一套控制台里完成项目采购、订单追踪、API Key 接入与回调观察，减少跨角色跳转。',
          action: { label: '进入项目市场', path: actionPath, buttonText: '前往项目市场' },
          focuses: [
            { title: '采购与订单串联', description: '从项目市场发起下单后，立即回到订单中心查看邮箱分配、提取结果与最终结算状态。' },
            { title: '集成准备', description: '通过 API Key、白名单与文档入口快速完成程序化接入，并对接真实回调能力。' },
          ],
        }
      }
    }
  }, [canOpenAdminRisk, canOpenProjects, canOpenSupplierDomains, fallbackRoute, user?.role])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>个人资料</Typography.Title>
        <Typography.Paragraph>
          在共享控制台中查看当前账号身份、角色边界与推荐操作路径，确保登录后直接进入与自身职责匹配的真实业务页面。
        </Typography.Paragraph>
      </div>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col xs={24} xl={10}>
          <Card
            style={{
              height: '100%',
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.92) 100%)',
              color: '#e2e8f0',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              <Tag color={roleColor(user?.role)}>{roleLabel(user?.role)}</Tag>
              <Typography.Title heading={4} style={{ color: '#f8fafc', margin: 0 }}>
                {user?.email ?? '未登录'}
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.78)', margin: 0 }}>
                {profileScene.summary}
              </Typography.Paragraph>
              <Descriptions
                align="left"
                data={[
                  { key: '角色标识', value: roleLabel(user?.role) },
                  { key: '账号状态', value: 'active' },
                  { key: '共享壳模式', value: 'single-console' },
                ]}
                style={{ width: '100%', color: '#e2e8f0' }}
              />
              <Button type="primary" theme="solid" onClick={() => navigate(profileScene.action.path)}>
                {profileScene.action.buttonText}
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title={profileScene.title} style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 24 }}>
            <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
              {profileScene.focuses.map((item) => (
                <Card
                  key={item.title}
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.92) 100%)',
                    border: '1px solid rgba(148,163,184,0.16)',
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Typography.Title heading={5} style={{ marginTop: 0 }}>{item.title}</Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>{item.description}</Typography.Paragraph>
                </Card>
              ))}
              <Banner
                type="info"
                fullMode={false}
                description={`当前推荐动作：${profileScene.action.label}。保持单一登录后控制台，不额外拆分独立后台。`}
                style={{ width: '100%' }}
              />
              <Card
                style={{
                  width: '100%',
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.92) 100%)',
                  border: '1px solid rgba(148,163,184,0.16)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                  <Typography.Title heading={5} style={{ margin: 0 }}>同一控制台内的下一步</Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, color: '#475569' }}>
                    根据当前菜单权限，你可以直接从资料页回到最关键的共享工作台入口，不需要寻找另一套角色后台。
                  </Typography.Paragraph>
                  <Space wrap>
                    {user?.role === 'user' && canOpenProjects ? (
                      <Button theme="borderless" type="primary" onClick={() => navigate(PROJECTS_ROUTE)}>
                        打开项目市场
                      </Button>
                    ) : null}
                    {user?.role === 'user' && canOpenApiKeys ? (
                      <Button theme="borderless" type="primary" onClick={() => navigate(API_KEYS_ROUTE)}>
                        打开 API Keys
                      </Button>
                    ) : null}
                    {user?.role === 'supplier' && canOpenSupplierDomains ? (
                      <Button theme="borderless" type="primary" onClick={() => navigate('/supplier/domains')}>
                        打开域名管理
                      </Button>
                    ) : null}
                    {user?.role === 'admin' && canOpenAdminRisk ? (
                      <Button theme="borderless" type="primary" onClick={() => navigate('/admin/risk')}>
                        打开风控中心
                      </Button>
                    ) : null}
                    {fallbackRoute !== profileScene.action.path ? (
                      <Button theme="light" type="primary" onClick={() => navigate(fallbackRoute)}>
                        前往推荐工作台
                      </Button>
                    ) : null}
                  </Space>
                </Space>
              </Card>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
