import { useTranslation } from 'react-i18next'

type RockerProps = {
  label: string
  value: boolean
  onChange?: (val: boolean) => void
}

export const RockerToggle: React.FC<RockerProps> = ({
  label,
  value,
  onChange
}) => {
  const { t } = useTranslation()

  return (
    <div>
      <label className="block font-semibold mb-2">{label}</label>
      <div className="flex rounded-md overflow-hidden border border-gray-300">
        <button
          className={`basis-1/2 py-3 font-semibold text-center ${
            !value ? 'bg-color-blue text-white' : 'bg-white text-black'
          }`}
          onClick={() => onChange?.(false)}
        >
          {t('common:no')}
        </button>
        <button
          className={`basis-1/2 py-3 font-semibold text-center ${
            value ? 'bg-color-blue text-white' : 'bg-white text-black'
          }`}
          onClick={() => onChange?.(true)}
        >
          {t('common:yes')}
        </button>
      </div>
    </div>
  )
}
