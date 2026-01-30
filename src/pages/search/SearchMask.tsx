import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Panel from '../../core/components/common/Panel'
import EntityMask from './components/EntityMask'
import PseudonymMask from './components/PseudonymMask'
import useSearchStore from './stores/SearchStore'

type SearchMode = 'entity' | 'pseudonym'

export default function SearchMask({ psn = false }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<SearchMode>('entity')
  const clearSearchInputs = useSearchStore((s) => s.clearSearchInputs)

  useEffect(() => {
    clearSearchInputs()
  }, [clearSearchInputs])

  const handleModeClick = (selected: SearchMode) => {
    setMode(selected)
    clearSearchInputs()
  }

  const titleContent = psn ? (
    ''
  ) : (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2 text-gray-700 text-lg font-medium">
        {t('search:searchFor')}
        <span
          onClick={() => handleModeClick('entity')}
          className={`cursor-pointer px-2 rounded-md transition-colors ${
            mode === 'entity'
              ? 'font-bold text-gray-900 bg-gray-200'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {t('search:anEntity')}
        </span>
        /
        <span
          onClick={() => handleModeClick('pseudonym')}
          className={`cursor-pointer px-2 rounded-md transition-colors ${
            mode === 'pseudonym'
              ? 'font-bold text-gray-900 bg-gray-200'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {t('search:aPseudonym')}
        </span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center w-full">
      <Panel title={titleContent}>
        {mode === 'entity' && <EntityMask psn={psn} />}
        {mode === 'pseudonym' && <PseudonymMask psn={psn} />}
      </Panel>
    </div>
  )
}
