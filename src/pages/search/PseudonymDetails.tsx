import { useState, useEffect } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PseudonymService from './services/PseudonymService'
import usePseudonymStore from './stores/PseudonymSearchResults'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import Panel from '../../core/components/common/Panel'
import Divider from '../../core/components/common/Divider'
import PseudonymTable from './components/PseudonymTable'
import { ProgressSpinner } from 'primereact/progressspinner'
import CustomFloatLabel from '@component/form/CustomFloatLabel'

// This component shows pseudonym details. If there is no data in the PseudonymStore, it takes the pseudonym from params and makes an api call to retrieve details.
// If there is data stored in PseudonymStore, it uses that data.

const PseudonymDetails: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { pseudonymValue, setPseudonymValue } = usePseudonymStore()
  const { entityId } = useParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pseudonymValue) {
      setLoading(true) // Start loading
      async function searchPsn() {
        try {
          const result = await PseudonymService.searchPseudonym()

          if (result) {
            setPseudonymValue(result)
          } else {
            console.error('Unexpected API response: ', result)
          }
        } catch (error) {
          console.error('Error during pseudonym fetch:', error)
        } finally {
          setLoading(false)
        }
      }

      searchPsn()
    }
  }, [pseudonymValue, setPseudonymValue])

  return (
    <div>
      <div className="relative w-full 2xl:w-4/5 2xl:mx-auto mb-3 flex items-center">
        <PrimaryOutlinedButton
          label={<span className="hidden sm:inline">{t('search:back')}</span>}
          onClick={() => navigate(entityId ? `/search/${entityId}` : '/')}
          icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
          className="shrink-0"
        />
        <h1 className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {t('search:pseudonymView')}
        </h1>
      </div>

      {loading && (
        <ProgressSpinner className="flex justify-center items-center" />
      )}
      {!loading && (
        <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
          <Panel className="flex-1">
            <h2>{t('search:pseudonym.data')}</h2>
            <Divider />
            {pseudonymValue && (
              <div className="gap-3 space-y-5">
                <CustomFloatLabel
                  id="pseudonym"
                  value={pseudonymValue.psn}
                  placeholder={t('search:pseudonym.value')}
                  readOnly
                />
                <div className='flex space-x-3'>
                  <CustomFloatLabel
                    id="idType"
                    value={pseudonymValue.identifierItem.idType}
                    placeholder={t('search:pseudonym.idType')}
                    readOnly
                  />
                  <CustomFloatLabel
                    id="id"
                    value={pseudonymValue.identifierItem.identifier}
                    placeholder={t('search:pseudonym.id')}
                    readOnly
                  />
                </div>
                <div className="flex space-x-3">
                  <CustomFloatLabel
                    id="createdOn"
                    value={pseudonymValue.validFrom.split('T')[0]}
                    placeholder={t('search:pseudonym.createdOn')}
                    readOnly
                  />
                  <CustomFloatLabel
                    id="expiresOn"
                    value={pseudonymValue.validTo.split('T')[0]}
                    placeholder={t('search:pseudonym.expiresOn')}
                    readOnly
                  />
                </div>
              </div>
            )}
          </Panel>
          <Panel className="flex-1">
            <h2>{t('search:pseudonym.parentGroup')}</h2>
            <Divider />
            {pseudonymValue && <PseudonymTable pseudonym={pseudonymValue} />}
          </Panel>
        </div>
      )}
    </div>
  )
}

export default PseudonymDetails
