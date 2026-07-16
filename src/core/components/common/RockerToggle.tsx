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
    <div className="td-rocker-toggle rounded-lg border border-transparent p-3">
      <label className="mb-2 block pr-7 font-semibold">{label}</label>
      <div className="flex overflow-hidden rounded-md border border-gray-300 dark:border-slate-700">
        <button
          type="button"
          className={`basis-1/2 py-3 text-center font-semibold ${
            !value
              ? 'bg-color-blue text-white'
              : 'bg-white text-black dark:bg-slate-950 dark:text-gray-100'
          }`}
          onClick={() => onChange?.(false)}
        >
          {t('common:no')}
        </button>
        <button
          type="button"
          className={`basis-1/2 py-3 text-center font-semibold ${
            value
              ? 'bg-color-blue text-white'
              : 'bg-white text-black dark:bg-slate-950 dark:text-gray-100'
          }`}
          onClick={() => onChange?.(true)}
        >
          {t('common:yes')}
        </button>
      </div>
    </div>
  )
}
