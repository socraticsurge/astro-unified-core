// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashaRow } from '../DashaRow'

const mahaEntry = {
  planet: 'Sun',
  start: '2020-04-15',
  end: '2026-04-15',
  isCurrentPeriod: false,
  antardashas: [
    { planet: 'Moon', start: '2020-04-15', end: '2021-04-15', isCurrentPeriod: true, pratyantardashas: [] },
    { planet: 'Mars', start: '2021-04-15', end: '2022-04-15', isCurrentPeriod: false, pratyantardashas: [] },
  ],
}

describe('DashaRow', () => {
  it('renders planet name and date range', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText(/2020/)).toBeInTheDocument()
  })

  it('does not show child rows when collapsed', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    expect(screen.queryByText('Moon')).not.toBeInTheDocument()
  })

  it('shows child rows when expanded', async () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Moon')).toBeInTheDocument()
    expect(screen.getByText('Mars')).toBeInTheDocument()
  })

  it('shows "● now" badge on current period rows', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={true} />)
    expect(screen.getByText('● now')).toBeInTheDocument()
  })

  it('renders a leaf row without aria-expanded and does not throw on click', async () => {
    const leaf = { planet: 'Rahu', start: '2022-01-01', end: '2023-01-01', isCurrentPeriod: false }
    render(<DashaRow entry={leaf} level={0} />)
    const btn = screen.getByRole('button')
    expect(btn).not.toHaveAttribute('aria-expanded')
    await userEvent.click(btn)
    expect(screen.queryByText('Moon')).not.toBeInTheDocument()
  })
})
