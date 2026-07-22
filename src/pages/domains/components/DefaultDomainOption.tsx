import { useTranslation } from "react-i18next"

export default function DefaultDomainOption() {
  const { t } = useTranslation()

  return (
    <h3 className="text-center mt-8 items-center">
      {t('groups:default.text')}
    </h3>
  )
}
