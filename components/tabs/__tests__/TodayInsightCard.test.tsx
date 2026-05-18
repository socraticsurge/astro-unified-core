// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayInsightCard } from '../TodayInsightCard'

const insight = {
  id: 'test-1',
  category: 'dasha' as const,
  categoryColor: '#c084fc',
  title: 'Jupiter in 10th — career expansion',
  body: 'Strong transit through 2025.',
  cta: { label: 'Ask an expert about this →', action: 'ask' as const },
}

describe('TodayInsightCard', () => {
  it('renders title and body', () => {
    render(<TodayInsightCard insight={insight} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.getByText('Jupiter in 10th — career expansion')).toBeInTheDocument()
    expect(screen.getByText('Strong transit through 2025.')).toBeInTheDocument()
  })

  it('renders the CTA when present', () => {
    render(<TodayInsightCard insight={insight} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.getByText('Ask an expert about this →')).toBeInTheDocument()
  })

  it('calls onAsk when ask CTA is clicked', async () => {
    const onAsk = vi.fn()
    render(<TodayInsightCard insight={insight} onAsk={onAsk} onExplore={() => {}} />)
    await userEvent.click(screen.getByText('Ask an expert about this →'))
    expect(onAsk).toHaveBeenCalledWith(insight)
  })

  it('renders without CTA when none provided', () => {
    render(<TodayInsightCard insight={{ ...insight, cta: undefined }} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onExplore when explore CTA is clicked', async () => {
    const onExplore = vi.fn()
    const exploreInsight = { ...insight, cta: { label: 'Explore in Chart →', action: 'explore' as const } }
    render(<TodayInsightCard insight={exploreInsight} onAsk={() => {}} onExplore={onExplore} />)
    await userEvent.click(screen.getByText('Explore in Chart →'))
    expect(onExplore).toHaveBeenCalledWith(exploreInsight)
  })
})
