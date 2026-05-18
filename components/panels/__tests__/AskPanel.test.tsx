// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AskPanel } from '../AskPanel'

const ctx = {
  profileName: 'Vinay',
  relationship: 'You',
  mahadasha: 'Sun',
  antardasha: 'Mars',
  tab: 'Today',
}

describe('AskPanel', () => {
  it('does not render panel content when closed', () => {
    render(<AskPanel open={false} onClose={() => {}} context={ctx} />)
    expect(screen.queryByText('Ask an expert')).not.toBeInTheDocument()
  })

  it('shows profile name and dasha context when open', () => {
    render(<AskPanel open={true} onClose={() => {}} context={ctx} />)
    expect(screen.getByText(/Vinay/)).toBeInTheDocument()
    expect(screen.getByText(/Sun · Mars/)).toBeInTheDocument()
  })

  it('shows insight title when provided', () => {
    render(<AskPanel open={true} onClose={() => {}} context={{ ...ctx, insightTitle: 'Jupiter in 10th' }} />)
    expect(screen.getByText(/Jupiter in 10th/)).toBeInTheDocument()
  })

  it('renders all 4 topic options', () => {
    render(<AskPanel open={true} onClose={() => {}} context={ctx} />)
    expect(screen.getByLabelText(/career/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dasha transition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/general/i)).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<AskPanel open={true} onClose={() => {}} context={ctx} />)
    expect(screen.getByRole('button', { name: /request consultation/i })).toBeInTheDocument()
  })
})
