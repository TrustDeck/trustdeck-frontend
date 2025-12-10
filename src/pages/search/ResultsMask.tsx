import { useNavigate } from 'react-router-dom'
import useSearchResultsStore from './stores/SearchResultsStore'
import SearchResult from '../../core/components/common/SearchResult'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'

// This component takes "results" from the SearchResultStore, maps over them and renders them in with the SearchResult component

const ResultsMask: React.FC = () => {
  const { t } = useTranslation()
  const { results } = useSearchResultsStore()
  const navigate = useNavigate()
  return (
    <div className="w-full">
      <div className="items-center flex flex-col w-full">
        <div className="w-full lg:w-4/5 flex flex-row items-center relative mb-3 mx-auto">
          <PrimaryOutlinedButton
            label={<span className="hidden sm:inline">{t('search:back')}</span>}
            onClick={() => navigate('/')}
            icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
            className="shrink-0 absolute left-0 top-0"
          />
          <h1 className="flex-1 text-center">{t('search:results')}</h1>
        </div>
      </div>
      {results.length === 0 ? (
        <p className="text-center">{t('search:noResults')}</p>
      ) : (
        results.map((result) => (
          <div
            key={result.trustdeckID}
            className="my-4 flex justify-center"
          >
            <SearchResult result={result} />
          </div>
        ))
      )}
    </div>
  )
}

export default ResultsMask
