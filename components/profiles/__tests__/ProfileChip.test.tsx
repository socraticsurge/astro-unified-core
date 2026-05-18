// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { ProfileChip } from '../ProfileChip'

describe('ProfileChip', () => {
  it('renders first name and relationship label', () => {
    render(<ProfileChip id="1" name="Vinay Kumar" relationship="You" isActive={false} onClick={() => {}} />)
    expect(screen.getByText('Vinay')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('sets aria-pressed true when isActive is true', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={true} onClick={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows alert dot when hasAlert is true', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={false} hasAlert onClick={() => {}} />)
    expect(screen.getByTestId('alert-dot')).toBeInTheDocument()
  })

  it('does not show alert dot when hasAlert is false', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={false} onClick={() => {}} />)
    expect(screen.queryByTestId('alert-dot')).not.toBeInTheDocument()
  })

  it('calls onClick with the chip id when clicked', () => {
    const onClick = vi.fn()
    render(<ProfileChip id="abc" name="Priya" relationship="Spouse" isActive={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('abc')
  })

  it('renders correctly with a single-word name', () => {
    render(<ProfileChip id="2" name="Priya" relationship="Spouse" isActive={false} onClick={() => {}} />)
    expect(screen.getByText('Priya')).toBeInTheDocument()
  })
})
