import { useTranslation } from 'react-i18next'

export default function DefaultDomainOption() {
  const { t } = useTranslation()

  return (
    <h3 className="td-section-title mt-8 text-center">
      {t('groups:default.text')}
    </h3>
  )
}
