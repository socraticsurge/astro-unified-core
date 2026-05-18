// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileNav } from '../ProfileNav'

const profiles = [
  { id: '1', name: 'Vinay Kumar', relationship: 'You' },
  { id: '2', name: 'Priya Kumar', relationship: 'Spouse' },
]

describe('ProfileNav', () => {
  it('renders first name of each profile as a chip', () => {
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={() => {}}
        onAskOpen={() => {}}
      />
    )
    expect(screen.getByText('Vinay')).toBeInTheDocument()
    expect(screen.getByText('Priya')).toBeInTheDocument()
  })

  it('renders the add profile link', () => {
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={() => {}}
        onAskOpen={() => {}}
      />
    )
    expect(screen.getByRole('link', { name: /add profile/i })).toHaveAttribute(
      'href',
      '/profiles/new'
    )
  })

  it('calls onAskOpen when Ask button is clicked', async () => {
    const onAskOpen = vi.fn()
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={() => {}}
        onAskOpen={onAskOpen}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /ask an expert/i }))
    expect(onAskOpen).toHaveBeenCalled()
  })

  it('calls onProfileChange when a chip is clicked', async () => {
    const onProfileChange = vi.fn()
    render(
      <ProfileNav
        profiles={profiles}
        activeProfileId="1"
        onProfileChange={onProfileChange}
        onAskOpen={() => {}}
      />
    )
    await userEvent.click(screen.getByText('Priya'))
    expect(onProfileChange).toHaveBeenCalledWith('2')
  })
})
