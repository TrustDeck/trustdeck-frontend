import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import useUserStore from '../stores/UserStore' // Import the UserStore

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
] // Add all your namespaces here

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: useUserStore.getState().locale,
    fallbackLng: 'en',
    ns: namespaces, // Load all namespaces
    defaultNS: 'common', // Set the default namespace to one of your namespaces
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json' // Path to your translation files
    },
    preload: namespaces, // Preload all namespaces
    debug: false // Enable debug mode to see more information in the console
  })

// Function to update the language
const updateLanguage = (language: string) => {
  //console.log('Changing language to:', language);
  i18n.changeLanguage(language)
}

// Subscribe to changes in the UserStore
useUserStore.subscribe(
  (state) => state.locale,
  (locale: string) => {
    updateLanguage(locale)
  }
)

export default i18n
