import { describe, expect, it } from 'vitest'
import { DOCUMENTATION_URL, HELP_PATH, isStandalonePage } from './publicPages'

describe('isStandalonePage', () => {
  it('shows the login, logged-out and help pages without the sidebar', () => {
    expect(isStandalonePage('/login')).toBe(true)
    expect(isStandalonePage('/logged-out')).toBe(true)
    expect(isStandalonePage(HELP_PATH)).toBe(true)
    expect(isStandalonePage('/help/')).toBe(true)
  })

  it('keeps the sidebar on the pages of the application', () => {
    expect(isStandalonePage('/projects')).toBe(false)
    expect(isStandalonePage('/helpers')).toBe(false)
    expect(isStandalonePage('/')).toBe(false)
  })
})

describe('help page links', () => {
  it('points to the help page and the public documentation', () => {
    expect(HELP_PATH).toBe('/help')
    expect(DOCUMENTATION_URL).toBe('https://github.com/TrustDeck/trustdeck-docs')
  })
})
