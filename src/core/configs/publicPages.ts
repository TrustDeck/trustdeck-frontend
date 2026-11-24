/** Path of the help page that explains TrustDeck to visitors who are not signed in. */
export const HELP_PATH = '/help'

/** End-user documentation of TrustDeck, linked from the help page. */
export const DOCUMENTATION_URL = 'https://github.com/TrustDeck/trustdeck-docs'

/** Pages that are shown on their own, without the sidebar of the signed-in application. */
const STANDALONE_PAGE_PATHS = ['/login', '/logged-out', HELP_PATH]

/** Checks whether a page is shown without the sidebar; a trailing slash is ignored. */
export function isStandalonePage(pathname: string) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return STANDALONE_PAGE_PATHS.includes(normalized)
}
