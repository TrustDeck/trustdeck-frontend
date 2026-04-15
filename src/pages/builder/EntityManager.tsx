import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BeakerIcon,
  PlusIcon,
  Squares2X2Icon,
  UserIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import CustomCard from '../../core/components/common/CustomCard'
import useProjectStore from '../../core/stores/ProjectStore'

export default function EntityManager() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const entities = useProjectStore((state) => state.entities)

  const cards = useMemo(() => {
    return entities.map((type) => {
      let icon = <Squares2X2Icon />
      if (type === 'person') icon = <UserIcon />
      else if (type === 'biosample') icon = <BeakerIcon />
      return { type, icon }
    })
  }, [entities])

  return (
    <div className="w-full flex justify-center">
      <div className="w-full text-center flex flex-col items-center">
        <Panel
          centered
          className="mx-auto"
          title={t('entityBuilder:entitiesInProject', 'Entities in this project')}
        >
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-16 my-4">
            {cards.map(({ type, icon }) => (
              <CustomCard
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
                icon={icon}
                className="mt-6 mb-6 min-w-[200px] sm:min-w-[220px] sm:flex-1 sm:max-w-[280px]"
              />
            ))}
            <CustomCard
              key="add-entity"
              title={t('entityBuilder:addEntity', 'Add entity')}
              icon={<PlusIcon />}
              className="mt-6 mb-6 min-w-[200px] sm:min-w-[220px] sm:flex-1 sm:max-w-[280px]"
              onClick={() => navigate('/entity/manager/new')}
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}
