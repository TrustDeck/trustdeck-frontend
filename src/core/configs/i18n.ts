import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import useUserStore from '../stores/UserStore'

const namespaces = [
  'layout',
  'common',
  'search',
  'identity',
  'permission',
  'groups',
  'pseudonyms',
  'projects',
  'settings',
  'entityBuilder'
]

export function normalizeUiLanguage(locale?: string | null): 'en' | 'de' {
  return locale?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

// Change this value whenever locale files are changed. It prevents browsers from
// continuing to use an older cached translation file after a frontend update.
const translationVersion = '2026-08-26-entity-type-terminology'

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: normalizeUiLanguage(useUserStore.getState().locale),
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    ns: namespaces,
    defaultNS: 'common',
    fallbackNS: 'common',
    returnEmptyString: false,
    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${translationVersion}`
    },
    interpolation: {
      escapeValue: false
    },
    debug: false
  })

useUserStore.subscribe(
  (state) => state.locale,
  (locale: string) => {
    void i18n.changeLanguage(normalizeUiLanguage(locale))
  }
)

export default i18n
