import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import useEntityStore from './stores/EntityStore'
import CustomCard from '../../core/components/common/CustomCard'
import Panel from '../../core/components/common/Panel'
import { UserIcon } from '@heroicons/react/24/outline'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { Squares2X2Icon } from '@heroicons/react/24/outline'
// import { PencilIcon } from '@heroicons/react/24/outline'
// import { DocumentTextIcon } from '@heroicons/react/24/outline'
// import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import { useTranslation } from 'react-i18next'
import TrustDeck from '../../core/services/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import ProjectService from '../projects/services/ProjectService'

export default function PreReg() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { entityType, setEntityType } = useEntityStore()
  const location = useLocation()

  const { entities, selectedProject, setEntities } = useProjectStore()

  useEffect(() => {
    setEntityType(null)
    const fetchDomain = async () => {
      try {
        const server = TrustDeck.instance()
        const domains = await server.getDomain()
        console.log(domains)
      } catch (error) {
        console.error('Error fetching domain:', error)
      }
    }
    const fetchEntities = async () => {
      if (!selectedProject?.abbreviation) return
      try {
        const projectEntities = await ProjectService.getProjectEntities()
        setEntities(projectEntities)
      } catch (error) {
        console.error('Error fetching project entities:', error)
      }
    }
    fetchDomain()
    fetchEntities()
  }, [location.pathname, selectedProject?.abbreviation, setEntities, setEntityType])

  function handleTypeClick(type: string) {
    setEntityType(type)
    navigate('/identity/register')
  }

  // function handleBulkClick(response: boolean) {
  //   setBulk(response)
  //   navigate('/identity/register')
  // }

  return (
    <div className="w-full flex justify-center">
      {!entityType && (
        <div className="w-full text-center flex flex-col items-center">
          <h1 className="mb-3">{t('identity:headers.registration')}</h1>
          <Panel centered title={t('identity:headers.chooseEntity')}>
            <div className="lg:flex lg:space-y-0 lg:gap-16 justify-center space-y-4 my-4">
              {entities.map((type) => {
                let icon = <Squares2X2Icon />
                if (type === 'person') icon = <UserIcon />
                else if (type === 'biosample') icon = <BeakerIcon />

                return (
                  <CustomCard
                    key={type}
                    title={type.charAt(0).toUpperCase() + type.slice(1)}
                    icon={icon}
                    compactUntil="lg"
                    className="mt-6 mb-6 min-w-[200px] lg:min-w-[220px] lg:flex-1 lg:max-w-[280px]"
                    onClick={() => handleTypeClick(type)}
                  />
                )
              })}
            </div>
          </Panel>
        </div>
      )}
      {/* {entityType && (
        <div className="w-full flex flex-col">
          <div className="items-center flex flex-col w-full">
            <div className="w-full lg:w-4/5 flex flex-row items-center relative mb-3">
              <PrimaryOutlinedButton
                label={
                  <span className="hidden sm:inline">
                    {t('identity:buttons.back')}
                  </span>
                }
                onClick={() => setEntityType(null)}
                icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />}
                className="shrink-0 absolute left-0 top-0"
              />
              <h1 className="flex-1 text-center">
                {t('identity:headers.registration')}
              </h1>
            </div>
          </div>

          <div className="flex justify-center">
            <Panel centered title={t('identity:headers.chooseAmount')}>
              <div className="sm:flex sm:space-y-0 justify-around space-y-4 my-4">
                <CustomCard
                  title={t('identity:headers.oneEntity')}
                  icon={<PencilIcon />}
                  className="mt-6"
                  onClick={() => handleBulkClick(false)}
                />
                <CustomCard
                  title={t('identity:headers.multipleEntities')}
                  icon={<DocumentTextIcon />}
                  className="mt-6 mb-6"
                  onClick={() => handleBulkClick(true)}
                />
              </div>
            </Panel>
          </div>
        </div>
      )} */}
    </div>
  )
}
