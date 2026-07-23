import React, { useEffect } from 'react'
import Panel from '../../../core/components/common/Panel'
import Divider from '../../../core/components/common/Divider'
import LinksTable from './LinksTable'
import { useTranslation } from 'react-i18next'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import useBioSampleStore from '../stores/BioSampleStore'
import { BioSampleData } from '../stores/BioSampleStore'
import CustomCalendar from '@component/form/CustomCalendar'
import validation from '../../../core/utils/validation'
import { BioSampleEntity } from '../../../core/types/BioSampleEntity'
import { Entity } from '../types/Entity'

interface BioSampleProps {
  entity: BioSampleEntity
  editMode: boolean
}

const BioSample: React.FC<BioSampleProps> = ({ entity, editMode = false }) => {
  const { t } = useTranslation()

  const {
    location,
    date,
    sampleNumber,
    contents,
    moi,
    setLocation,
    setDate,
    setSampleNumber,
    setContents,
    setMoi,
    loadEntity
  } = useBioSampleStore()

  useEffect(() => {
    if (editMode) {
      loadEntity(entity as unknown as Partial<BioSampleData>) //TODO dirty fix, needs proper mapping
    }
  }, [editMode, entity, loadEntity])

  return (
    <div className="w-full space-y-8 lg:flex lg:space-x-4 lg:space-y-0">
      <Panel title={t('search:headers.data')} className="flex-1">
        <Divider />
        <div className="space-y-5">
          <div className="flex gap-3">
            <div
              className={
                editMode ? 'flex-1' : 'w-full flex flex-col items-start'
              }
            >
              <CustomFloatLabel
                id="location"
                value={location}
                placeholder={t('search:entity.biosample.location.placeholder')}
                readOnly={!editMode}
                onChange={(e) => setLocation(e.target.value)}
                validate={validation.isValidRegistrationLocation}
              />
            </div>

            {editMode ? (
              <div className="flex flex-col flex-1">
                <CustomCalendar
                  id="date"
                  placeholder={t('search:entity.biosample.date.placeholder')}
                  value={date ? new Date(date) : null}
                  onChange={(e) =>
                    setDate(e.value ? e.value.toISOString().split('T')[0] : '')
                  }
                />
              </div>
            ) : (
              <CustomFloatLabel
                id="date"
                value={entity.date ? String(entity.date).split('T')[0] : ''}
                placeholder={t('search:entity.biosample.date.placeholder')}
                readOnly={!editMode}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </div>
          <div className="flex space-x-3">
            <CustomFloatLabel
              id="contents"
              value={contents}
              placeholder={t('search:entity.biosample.contents.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContents(e.target.value)}
              validate={validation.isValidRegistrationLocation}
            />
            <CustomFloatLabel
              id="id"
              value={sampleNumber}
              placeholder={t(
                'search:entity.biosample.sampleNumber.placeholder'
              )}
              readOnly={!editMode}
              onChange={(e) => setSampleNumber(e.target.value)}
              validate={validation.isValidRegistrationLocation}
            />
          </div>
        </div>
      </Panel>

      <Panel title={t('search:headers.links')} className="flex-1">
        <Divider />
        <div className="w-full overflow-auto">
          <LinksTable entity={entity as unknown as Entity} />
        </div>

        <h2 className="td-section-title mt-8">
          {t('search:headers.identifiers')}
        </h2>
        <Divider />
        <CustomFloatLabel
          id="MOI"
          value={moi}
          placeholder={t('search:masterObjectIndex')}
          readOnly={!editMode}
          onChange={(e) => setMoi(e.target.value)}
          className="my-8"
        />
      </Panel>
    </div>
  )
}

export default BioSample
