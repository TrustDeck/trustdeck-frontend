const THEME_STORAGE_KEY = 'trustdeck:theme'

/** Reads the stored theme, falling back to the operating system's preference. */
export function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {
    // Storage can be unavailable, e.g. in private windows
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Applies the theme to the document and remembers it. */
export function applyDarkMode(darkMode: boolean): void {
  document.documentElement.classList.toggle('dark', darkMode)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light')
  } catch {
    // The theme then only lasts for this page load
  }
}
