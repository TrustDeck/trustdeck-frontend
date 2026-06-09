import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BeakerIcon,
  PlusIcon,
  Squares2X2Icon,
  UserIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import CustomCard from '../../core/components/common/CustomCard'
import useProjectStore from '../../core/stores/ProjectStore'
import TrustDeck, { EntityTypePayload } from '../../core/services/TrustDeck'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import useToastStore from '../../core/stores/ToastStore'

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function EntityManager() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const entities = useProjectStore((state) => state.entities)
  const setEntities = useProjectStore((state) => state.setEntities)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const [entityDefinitions, setEntityDefinitions] = useState<EntityTypePayload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadEntityTypes() {
      if (!selectedProject?.abbreviation) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const response = await TrustDeck.instance().getProjectEntities('*')
        if (!active) return
        const definitions = Array.isArray(response) ? response : []
        setEntityDefinitions(definitions)
        const names = Array.from(
          new Set(
            definitions
              .map((entry: any) => entry?.name ?? entry?.typeName)
              .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
          )
        )
        setEntities(names)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('404')) {
          console.error('Failed to load project entity types', error)
          showToast({ severity: 'error', summary: 'Error', detail: 'Could not load entity types.', life: 4000 })
        }
        if (active) {
          setEntityDefinitions([])
          setEntities([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEntityTypes()
    return () => {
      active = false
    }
  }, [selectedProject?.abbreviation, setEntities, showToast])

  const cards = useMemo(() => {
    return entities.map((type) => {
      let icon = <Squares2X2Icon />
      if (type === 'person') icon = <UserIcon />
      else if (type === 'biosample') icon = <BeakerIcon />
      return { type, icon }
    })
  }, [entities])

  const handleExport = async (type: string) => {
    try {
      const fromList = entityDefinitions.find((definition) => definition.name === type)
      const definition = fromList ?? (await TrustDeck.instance().getType(type))
      downloadJson(`${type}-entity-type.json`, definition)
      showToast({ severity: 'success', summary: 'Export ready', detail: `${type} was exported as JSON.`, life: 2500 })
    } catch (error) {
      console.error('Could not export entity type', error)
      showToast({ severity: 'error', summary: 'Export failed', detail: `Could not export ${type}.`, life: 4000 })
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full text-center flex flex-col items-center">
        <Panel
          centered
          className="mx-auto"
          title={t('entityBuilder:entitiesInProject', 'Entities in this project')}
        >
          {loading ? (
            <div className="py-10 text-gray-500">Loading entity types...</div>
          ) : cards.length === 0 ? (
            <div className="my-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900">No entity types configured yet</h2>
              <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                This project does not have any project-specific entity types yet. Create one with the entity builder before registering or searching entities in this project.
              </p>
              <div className="mt-6 flex justify-center">
                <PrimaryButton label="Open entity builder" onClick={() => navigate('/entity/manager/new')} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4 sm:gap-8 my-4">
              {cards.map(({ type, icon }) => (
                <div key={type} className="flex flex-col items-center gap-2">
                  <CustomCard
                    title={type.charAt(0).toUpperCase() + type.slice(1)}
                    icon={icon}
                    className="mt-6 min-w-[200px] sm:min-w-[220px] sm:flex-1 sm:max-w-[280px]"
                  />
                  <PrimaryOutlinedButton
                    label={
                      <span className="inline-flex items-center gap-2">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export JSON
                      </span>
                    }
                    onClick={() => handleExport(type)}
                    className="text-sm"
                  />
                </div>
              ))}
              <CustomCard
                key="add-entity"
                title={t('entityBuilder:addEntity', 'Add entity')}
                icon={<PlusIcon />}
                className="mt-6 mb-6 min-w-[200px] sm:min-w-[220px] sm:flex-1 sm:max-w-[280px]"
                onClick={() => navigate('/entity/manager/new')}
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
