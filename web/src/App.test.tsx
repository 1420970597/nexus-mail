import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App', () => {
  it('renders dashboard shell', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Nexus-Mail 控制台')).toBeInTheDocument()
    expect(screen.getByText('项目概览')).toBeInTheDocument()
  })
})
