// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileNav } from '../ProfileNav'

const profiles = [
  { id: '1', name: 'Vinay Kumar', relationship: 'You' },
  { id: '2', name: 'Priya Kumar', relationship: 'Spouse' },
]

describe('ProfileNav', () => {
  it('renders full name of each profile as a chip', () => {
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={() => {}}
      />
    )
    expect(screen.getByText('Vinay Kumar')).toBeInTheDocument()
    expect(screen.getByText('Priya Kumar')).toBeInTheDocument()
  })

  it('calls onProfileChange when a chip is clicked', async () => {
    const onProfileChange = vi.fn()
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={onProfileChange}
      />
    )
    await userEvent.click(screen.getByText('Priya Kumar'))
    expect(onProfileChange).toHaveBeenCalledWith('2')
  })
})
