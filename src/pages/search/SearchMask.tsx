import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Panel from '../../core/components/common/Panel'
import EntityMask from './components/EntityMask'
import PseudonymMask from './components/PseudonymMask'
import useSearchStore from './stores/SearchStore'
import PageHeader from '../../core/components/common/PageHeader'

type SearchMode = 'entity' | 'pseudonym'

export default function SearchMask({ psn = false }) {
  const { t } = useTranslation('search')
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
        {t('searchFor')}
        <span
          onClick={() => handleModeClick('entity')}
          className={`cursor-pointer px-3 py-1 rounded-md transition-colors ${
            mode === 'entity'
              ? 'font-bold text-white bg-color-blue shadow-sm'
              : 'search-toggle-unselected text-gray-600 bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {t('anEntity')}
        </span>
        /
        <span
          onClick={() => handleModeClick('pseudonym')}
          className={`cursor-pointer px-3 py-1 rounded-md transition-colors ${
            mode === 'pseudonym'
              ? 'font-bold text-white bg-color-blue shadow-sm'
              : 'search-toggle-unselected text-gray-600 bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {t('aPseudonym')}
        </span>
      </div>
    </div>
  )

  return (
    <div className={psn ? 'w-full' : 'td-page-shell'}>
      {!psn && (
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
        />
      )}
      <Panel title={titleContent} className="!w-full">
        {mode === 'entity' && <EntityMask psn={psn} inlineResults={!psn} />}
        {mode === 'pseudonym' && <PseudonymMask psn={psn} inlineResults={!psn} />}
      </Panel>
    </div>
  )
}
