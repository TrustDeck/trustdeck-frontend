import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DOCUMENTATION_URL } from '../../core/configs/publicPages'
import Help from './Help'

describe('Help', () => {
  // Rendered without an AuthProvider: the page must not depend on a signed-in session.
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Help)))

  it('renders without a session and explains TrustDeck', () => {
    expect(html).toContain('common:helpPage.title')
    expect(html).toContain('common:helpPage.what.text')
    expect(html).toContain('common:helpPage.who.text')
    expect(html).toContain('common:helpPage.access.text')
  })

  it('links to the documentation and back to the sign-in', () => {
    expect(html).toContain(`href="${DOCUMENTATION_URL}"`)
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('href="/login"')
  })
})
