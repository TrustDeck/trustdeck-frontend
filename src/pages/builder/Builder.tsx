import { useTranslation } from 'react-i18next'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../../core/components/common/Panel'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '../../core/components/form/CustomDropdown'
import { Dialog } from 'primereact/dialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import ColumnCard from './components/ColumnCard'
import { Attribute, useEntityTypeStore } from './stores/EntityTypeStore'
import { defaultAttributes } from './configs/attributes'
import IconButton from './components/IconButton'
import Inspector from './components/Inspector'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { DragContainer } from './components/DragContainer'
import TrustDeck from '../../core/services/TrustDeck'
import GroupService from '../groups/service/GroupService'
import useProjectStore from '../../core/stores/ProjectStore'

type BaseTypeResponse = {
  name: string
  typeDefinition?: any
}

function mapBaseTypeAttribute(attribute: any): Attribute {
  const isStringType = attribute?.type === 'string'
  const isGroup = attribute?.layout === 'group'
  const isRow = attribute?.layout === 'row'
  const mapped: Attribute = {
    key: crypto.randomUUID(),
    ...(attribute?.name && (isGroup || attribute?.type) ? { name: attribute.name } : {}),
    labelEn: attribute?.label_en ?? attribute?.labelEn,
    labelDe: attribute?.label_de ?? attribute?.labelDe,
    type: attribute?.type,
    required: attribute?.required,
    linkage: attribute?.linkage,
    repeatable: attribute?.repeatable,
    minLength: isStringType ? attribute?.minLength : undefined,
    maxLength: isStringType ? attribute?.maxLength : undefined,
    values: attribute?.values ?? attribute?.enum,
    group: isGroup,
    layout: isRow ? 'row' : 'col'
  }

  if (Array.isArray(attribute?.attributes)) {
    mapped.attributes = attribute.attributes.map((sub: any) =>
      mapBaseTypeAttribute(sub)
    )
  }

  return mapped
}

function buildAttributesFromBaseType(baseType: BaseTypeResponse): Attribute[] {
  const definition = baseType?.typeDefinition
  if (!definition) return []

  if (definition.layout === 'group' && Array.isArray(definition.attributes)) {
    const nestedGroups = definition.attributes.filter(
      (attr: any) => attr?.layout === 'group'
    )
    if (
      nestedGroups.length > 0 &&
      nestedGroups.length === definition.attributes.length
    ) {
      return definition.attributes.map((attr: any) => mapBaseTypeAttribute(attr))
    }

    return [
      {
        key: crypto.randomUUID(),
        group: true,
        layout: 'col',
        labelEn: definition.label_en ?? definition.labelEn ?? baseType.name,
        labelDe: definition.label_de ?? definition.labelDe ?? baseType.name,
        name: definition.name,
        attributes: definition.attributes.map((attr: any) =>
          mapBaseTypeAttribute(attr)
        )
      }
    ]
  }

  if (Array.isArray(definition.attributes)) {
    return definition.attributes.map((attr: any) => mapBaseTypeAttribute(attr))
  }

  return []
}

function shouldIncludeContainerName(attribute: Attribute): boolean {
  if (!attribute.name || attribute.name === 'custom') return false
  const labelSlug = (attribute.labelEn ?? '').trim().replace(/\s+/g, '').toLowerCase()
  const nameSlug = attribute.name.replace(/\s+/g, '').toLowerCase()
  return nameSlug !== labelSlug
}

function serializeAttribute(attribute: Attribute): any {
  const buildBackendName = () => {
    if (attribute.name && attribute.name !== 'custom') return attribute.name
    const englishLabel = (attribute.labelEn ?? '').trim()
    if (!englishLabel) return attribute.name
    return englishLabel.replace(/\s+/g, '')
  }

  if (
    attribute.layout === 'row' &&
    Array.isArray(attribute.attributes) &&
    attribute.attributes.length > 0
  ) {
    return {
      layout: 'row',
      attributes: attribute.attributes.map((sub) => serializeAttribute(sub))
    }
  }

  if (Array.isArray(attribute.attributes) && attribute.attributes.length > 0) {
    const container: any = {
      layout: 'group',
      attributes: attribute.attributes.map((sub) => serializeAttribute(sub))
    }

    if (shouldIncludeContainerName(attribute)) {
      container.name = attribute.name
    }
    if (attribute.labelEn) container.label_en = attribute.labelEn
    if (attribute.labelDe) container.label_de = attribute.labelDe
    if (attribute.group) {
      container.repeatable = attribute.repeatable === true
    }

    return container
  }

  const field: any = {}
  const backendName = buildBackendName()
  if (backendName) field.name = backendName
  if (attribute.labelEn) field.label_en = attribute.labelEn
  if (attribute.labelDe) field.label_de = attribute.labelDe
  if (attribute.type) field.type = attribute.type
  field.required = attribute.required === true
  field.linkage = attribute.linkage === true
  field.repeatable = attribute.repeatable === true
  if (attribute.type === 'string') {
    if (attribute.minLength !== undefined) field.minLength = attribute.minLength
    if (attribute.maxLength !== undefined) field.maxLength = attribute.maxLength
  }
  if (attribute.type === 'enum') {
    const nextValues = (attribute.values ?? []).filter(
      (value) => typeof value === 'string' && value.trim().length > 0
    )
    field.values = nextValues
  }

  return field
}

function flattenGroupOptions(nodes: any[]): { label: string; value: string }[] {
  return nodes.flatMap((n) => [
    { label: n.label, value: n.label },
    ...(n.children ? flattenGroupOptions(n.children) : [])
  ])
}

const Builder: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showLayoutDialog, setShowLayoutDialog] = useState(false)
  const [showAttributesDialog, setShowAttributesDialog] = useState(false)
  const [entityNameConfirmed, setEntityNameConfirmed] = useState(false)
  const [domainConfirmed, setDomainConfirmed] = useState(false)
  const [domainOptions, setDomainOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [baseTypeOptions, setBaseTypeOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [selectedBaseType, setSelectedBaseType] = useState('')
  const [baseTypes, setBaseTypes] = useState<BaseTypeResponse[]>([])

  const { selectedProject } = useProjectStore()

  const {
    selectedKey,
    setSelectedKey,
    entityType,
    setEntityType,
    linkedDomain,
    setLinkedDomain,
    attributes,
    setAttributes,
    appendAttribute,
    appendSubAttributes,
    overrideAttribute,
    getSelectedAttribute,
    moveSubAttribute,
    deleteAttribute
  } = useEntityTypeStore()

  const selected = getSelectedAttribute()

  useEffect(() => {
    setEntityType('')
    setLinkedDomain('')
    setAttributes([])
    setSelectedKey('')
    setEntityNameConfirmed(false)
    setDomainConfirmed(false)
  }, [setAttributes, setEntityType, setLinkedDomain, setSelectedKey])

  useEffect(() => {
    if (!entityNameConfirmed) return
    let active = true
    GroupService.getGroups()
      .then((data) => {
        if (!active) return
        const options = flattenGroupOptions(data ?? [])
        setDomainOptions(options)
        const currentDomain = useEntityTypeStore.getState().linkedDomain
        if (!currentDomain && options.length > 0) {
          const defaultDomain =
            options.find((o) => o.value === selectedProject?.abbreviation)
              ?.value ?? options[0].value
          setLinkedDomain(defaultDomain)
        }
      })
      .catch((error) => {
        console.error('Failed to load domains', error)
        if (!active) return
        setDomainOptions([])
      })
    return () => {
      active = false
    }
  }, [entityNameConfirmed, selectedProject?.abbreviation, setLinkedDomain])

  useEffect(() => {
    let active = true
    async function loadBaseTypes() {
      try {
        const response = await TrustDeck.instance().getBaseTypes('*')
        if (!active) return
        setBaseTypes(response ?? [])
        const options = (response ?? [])
          .map((item: any) => item?.name)
          .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
          .map((name) => ({ label: name, value: name }))
        setBaseTypeOptions(options)
        if (options.length) {
          setSelectedBaseType((prev) => prev || options[0].value)
        }
      } catch (error) {
        console.error('Failed to load base types', error)
        if (!active) return
        setBaseTypeOptions([])
      }
    }
    loadBaseTypes()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!domainConfirmed || !selectedBaseType) return
    const selectedDefinition = baseTypes.find(
      (baseType) => baseType.name === selectedBaseType
    )
    if (!selectedDefinition) return

    const mappedAttributes = buildAttributesFromBaseType(selectedDefinition)
    setAttributes(mappedAttributes)
    setSelectedKey('')
  }, [baseTypes, domainConfirmed, selectedBaseType, setAttributes, setSelectedKey])

  async function handleLayoutClick(columns: number) {
    setShowLayoutDialog(false)

    let attribute: Attribute = {
      key: crypto.randomUUID()
    }

    if (columns >= 2 && columns <= 3) {
      attribute = {
        key: crypto.randomUUID(),
        layout: 'row',
        attributes: []
      }

      for (let i = 0; i < columns; i++) {
        attribute.attributes?.push({
          key: crypto.randomUUID()
        })
      }
    }

    appendSubAttributes(selectedKey, attribute)
    console.log(`Selected layout with ${columns} columns`)
  }

  async function handleAddGroup(addGroup: boolean) {
    const newKey = crypto.randomUUID()

    appendAttribute({
      key: newKey,
      group: addGroup,
      layout: 'col'
    })

    if (addGroup) {
      setSelectedKey(newKey)
    }
  }

  async function handleSaveEntityConfig() {
    const payload = {
      name: entityType,
      version: 'v1.0',
      associatedDomainName: linkedDomain,
      baseTypeName: selectedBaseType || undefined,
      typeDefinition: {
        layout: 'group',
        label_en: entityType,
        label_de: entityType,
        attributes: attributes.map((attribute) => serializeAttribute(attribute))
      }
    }

    try {
      await TrustDeck.instance().createEntityConfig(payload)
      console.log('Entity config saved successfully')
    } catch (error) {
      console.error('Failed to save entity config', error)
    }
  }

  function getLayoutDialog() {
    return (
      <Dialog
        key={'layout-dialog'}
        header="Choose a layout for the new row"
        visible={showLayoutDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowLayoutDialog(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColumnCard
            key={'1-column'}
            title={'1 Column'}
            columns={
              <div className=" w-full h-24 border-2 border-black bg-white"></div>
            }
            onClick={() => handleLayoutClick(1)}
          />
          <ColumnCard
            key={'2-columns'}
            title={'2 Columns'}
            columns={
              <div className="flex flex-row h-full">
                <div className="w-1/2 h-24 border-2 border-black bg-white"></div>
                <div className="w-1/2 h-24 border-2 border-black bg-white"></div>
              </div>
            }
            onClick={() => handleLayoutClick(2)}
          />
          <ColumnCard
            key={'3-columns'}
            title={'3 Columns'}
            columns={
              <div className="flex flex-row h-full">
                <div className="w-1/3 h-24 border-2 border-black bg-white"></div>
                <div className="w-1/3 h-24 border-2 border-black bg-white"></div>
                <div className="w-1/3 h-24 border-2 border-black bg-white"></div>
              </div>
            }
            onClick={() => handleLayoutClick(3)}
          />
        </div>
      </Dialog>
    )
  }

  function getAttributesDisplay() {
    return (
      <Dialog
        key={'attributes-dialog'}
        header={t('entityBuilder:chooseField', 'Choose a field')}
        visible={showAttributesDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowAttributesDialog(false)}
      >
        {defaultAttributes.map((attribute) => {
          const key = attribute.name ?? ''
          const label = key ? t(`entityBuilder:attributes.${key}`) : ''
          return (
            <div
              key={key}
              className="border p-4 mb-2 cursor-pointer"
              onClick={() => {
                setShowAttributesDialog(false)
                overrideAttribute(selectedKey, attribute)
              }}
            >
              {label || attribute.name}
            </div>
          )
        })}
        <div
          className="border p-4 mt-4 cursor-pointer"
          onClick={() => {
            // Custom field: user fills in all properties in Inspector
            setShowAttributesDialog(false)
            overrideAttribute(selectedKey, {
              key: selectedKey,
              name: 'custom',
              labelEn: '',
              labelDe: '',
              type: 'string',
              required: false,
              linkage: false,
              repeatable: false,
              minLength: 0,
              maxLength: 255
            } as Attribute)
            setSelectedKey(selectedKey)
          }}
        >
          {t('entityBuilder:customField', 'Custom field')}
        </div>
      </Dialog>
    )
  }

  function getLayoutField(cssWidthClass: string, attribute: Attribute) {
    return (
      <div
        className={`${cssWidthClass} border p-2 bg-white cursor-pointer flex flex-row justify-between items-center`}
        onClick={() => {
          setSelectedKey(attribute.key)
          if (!attribute.name) {
            setShowAttributesDialog(true)
          }
        }}
      >
        {attribute.name ? (
          <>
            <div>
              {(() => {
                const localizedCustomLabel = i18n.language.startsWith('de')
                  ? attribute.labelDe ?? attribute.labelEn
                  : attribute.labelEn ?? attribute.labelDe

                if (attribute.name === 'custom') {
                  return (
                    localizedCustomLabel ||
                    t('entityBuilder:customField', 'Custom field')
                  )
                }

                return t(`entityBuilder:attributes.${attribute.name}`, {
                  defaultValue: localizedCustomLabel || attribute.name
                })
              })()}
            </div>
            <button
              type="button"
              className="p-1 text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedKey(attribute.key)
                setShowAttributesDialog(true)
              }}
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          </>
        ) : (
          t('entityBuilder:selectField', 'Select a field')
        )}
      </div>
    )
  }

  function subAttributeBlock(attribute: Attribute) {
    /*
          <div className="flex flex-row justify-between mb-4 w-full">
            
            <div>
              <IconButton
                onClick={() => console.log('Edit Group')}
                icon={<PencilIcon className="h-5 w-5" />}
              />
            </div>
          </div>
    */

    return (
      <div className="flex flex-col w-full">
        <div className="flex flex-col w-full">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {(() => {
                const lang = i18n.language || 'en'
                const label =
                  lang.startsWith('de')
                    ? attribute.labelDe ?? attribute.labelEn
                    : attribute.labelEn ?? attribute.labelDe
                return label || attribute.name || 'Section'
              })()}
            </h3>
          </div>
          {attribute.attributes?.map((subAttr: Attribute, subIndex: number) =>
            renderCard(
              {
                key: subAttr.key,
                node: (
                  <div className="mb-2 w-full">
                    {subAttr.layout === 'row' &&
                    subAttr.attributes?.length === 3 ? (
                      <div className="flex gap-2">
                        {getLayoutField('w-1/3', subAttr.attributes[0])}
                        {getLayoutField('w-1/3', subAttr.attributes[1])}
                        {getLayoutField('w-1/3', subAttr.attributes[2])}
                      </div>
                    ) : subAttr.layout === 'row' &&
                      subAttr.attributes?.length === 2 ? (
                      <div className="flex gap-2">
                        {getLayoutField('w-1/2', subAttr.attributes[0])}
                        {getLayoutField('w-1/2', subAttr.attributes[1])}
                      </div>
                    ) : (
                      <>{getLayoutField('w-full', subAttr)}</>
                    )}
                  </div>
                )
              },
              subIndex,
              attribute.key
            )
          )}
        </div>
        <div className="flex w-full items-center justify-center mt-4">
                <PrimaryButton
                  label={
                    <span className="flex items-center gap-2">
                      <PlusIcon className="h-5 w-5" />
                      {t('entityBuilder:row', 'Row')}
                    </span>
                  }
                  onClick={() => {
                    setSelectedKey(attribute.key)
                    setShowLayoutDialog(true)
                  }}
                />
        </div>
      </div>
    )
  }

  const moveCard = useCallback(
    (listId: string, dragIndex: number, hoverIndex: number) => {
      moveSubAttribute(listId, dragIndex, hoverIndex)
    },
    [moveSubAttribute]
  )

  const renderCard = useCallback(
    (
      card: { key: string; node: React.ReactNode },
      index: number,
      listId: string
    ) => {
      return (
        <DragContainer
          key={card.key} // stabile key
          index={index}
          node={card.node}
          listId={listId}
          moveCard={moveCard}
        />
      )
    },
    [moveCard]
  )

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        {getLayoutDialog()}
        {getAttributesDisplay()}
        <div className="w-full flex justify-center">
          <div className="w-full text-center flex flex-col items-center">
            <div className="mb-4 w-full">
              <PrimaryOutlinedButton
                label={t('common:back', 'Back')}
                icon={<ArrowLeftIcon className="h-5 w-5" />}
                iconPos="left"
                onClick={() => navigate('/entity/manager')}
              />
            </div>
            {!entityNameConfirmed ? (
              <div className="mb-8 w-full">
                <Panel centered className="mx-auto">
                  <h1 className="text-xl font-semibold text-center mb-3">
                    {t(
                      'entityBuilder:entityNameQuestion',
                      'What do you want this entity to be called?'
                    )}
                  </h1>
                  <div className="mb-3">
                    <CustomFloatLabel
                      id="entityTypeName"
                      value={entityType}
                      placeholder={t('entityBuilder:entityName') || 'Entity name'}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEntityType(e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <PrimaryOutlinedButton
                      label={t('entityBuilder:acceptName', 'Use this name')}
                      onClick={() => setEntityNameConfirmed(true)}
                      disabled={!entityType}
                    />
                  </div>
                </Panel>
              </div>
            ) : !domainConfirmed ? (
              <div className="mb-8 w-full">
                <Panel centered className="mx-auto">
                  <h1 className="text-xl font-semibold text-center mb-3">
                    {t(
                      'entityBuilder:selectDomainQuestion',
                      'Which domain should this entity be linked to?'
                    )}
                  </h1>
                  {domainOptions.length > 0 ? (
                    <div className="mb-3">
                      <CustomDropdown
                        id="linkedDomain"
                        value={linkedDomain}
                        onChange={(e) => setLinkedDomain(e.value ?? '')}
                        options={domainOptions}
                        placeholder={t('entityBuilder:selectDomain', 'Domain')}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mb-3">
                      {t(
                        'entityBuilder:noDomainsAvailable',
                        'No domains are available in this project. Create a group first.'
                      )}
                    </p>
                  )}
                  <div className="flex justify-between gap-3">
                    <PrimaryOutlinedButton
                      label={t('entityBuilder:changeName', 'Change name')}
                      onClick={() => {
                        setEntityNameConfirmed(false)
                        setDomainConfirmed(false)
                        setLinkedDomain('')
                      }}
                    />
                    <PrimaryOutlinedButton
                      label={t('entityBuilder:acceptDomain', 'Continue')}
                      onClick={() => setDomainConfirmed(true)}
                      disabled={!linkedDomain}
                    />
                  </div>
                </Panel>
              </div>
            ) : (
              <div className="mb-8 flex flex-col items-center gap-1">
                <h1 className="text-2xl font-semibold">
                  {entityType || t('entityBuilder:entityName')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('entityBuilder:selectDomain', 'Domain')}: {linkedDomain}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      setEntityNameConfirmed(false)
                      setDomainConfirmed(false)
                      setLinkedDomain('')
                    }}
                  >
                    {t('entityBuilder:changeName', 'Change name')}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setDomainConfirmed(false)}
                  >
                    {t('entityBuilder:changeDomain', 'Change domain')}
                  </button>
                </div>
              </div>
            )}

            {entityNameConfirmed && domainConfirmed && entityType && linkedDomain && (
              <>
                <div className="w-full 2xl:w-4/5 2xl:mx-auto mb-4">
                  <Panel centered className="mx-auto">
                    <h2 className="text-lg font-semibold text-center mb-3">
                      {t('entityBuilder:selectBaseType', 'Select a base type')}
                    </h2>
                    <CustomDropdown
                      id="baseType"
                      value={selectedBaseType}
                      onChange={(e) => setSelectedBaseType(e.value)}
                      options={baseTypeOptions}
                      placeholder={t('entityBuilder:baseType', 'Base type')}
                    />
                  </Panel>
                </div>
              <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
                <Panel
                  centered className="mx-auto"
                >
              <div className="grid grid-cols-2 gap-4 my-4 items-center justify-center justify-items-center">
                <PrimaryOutlinedButton
                  label={
                    <span className="flex items-center gap-2">
                      <PlusIcon className="h-5 w-5" />
                      {t('entityBuilder:addBlock', 'Add block')}
                    </span>
                  }
                  onClick={() => handleAddGroup(false)}
                />
                <PrimaryOutlinedButton
                  label={
                    <span className="flex items-center gap-2">
                      <PlusIcon className="h-5 w-5" />
                      {t('entityBuilder:addGroup', 'Add section')}
                    </span>
                  }
                  onClick={() => handleAddGroup(true)}
                />
              </div>

              {attributes.map((attribute, index) => {
                return (
                  <div key={attribute.key} className="mt-2 mb-4">
                    {attribute.group
                      ? renderCard(
                          {
                            key: attribute.key,
                            node: (
                              <>
                                <div className="flex flex-row flex-grow flex-1 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                                  <div className="p-4 flex flex-grow flex-1">
                                    {subAttributeBlock(attribute)}
                                  </div>
                                  <div className="flex flex-col border-l border-gray-200 bg-white">
                                    <IconButton
                                      onClick={() => {
                                        setSelectedKey(attribute.key)
                                      }}
                                      icon={<PencilIcon className="h-5 w-5" />}
                                    />
                                    <IconButton
                                      onClick={() => deleteAttribute(attribute.key)}
                                      icon={<TrashIcon className="h-5 w-5" />}
                                    />
                                  </div>
                                </div>
                              </>
                            )
                          },
                          index,
                          'root'
                        )
                      : renderCard(
                          {
                            key: attribute.key,
                            node: (
                              <>
                                <div className="flex flex-row flex-grow flex-1 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                                  <div className="p-4 flex flex-grow flex-1">
                                    {getLayoutField('w-full', attribute)}
                                  </div>
                                  <div className="flex flex-col border-l border-gray-200 bg-white">
                                    <IconButton
                                      onClick={() => deleteAttribute(attribute.key)}
                                      icon={<TrashIcon className="h-5 w-5" />}
                                    />
                                  </div>
                                </div>
                              </>
                            )
                          },
                          index,
                          'root'
                        )}
                  </div>
                )
              })}

              <div className="mt-4 w-full">
                <PrimaryButton
                  label={t('entityBuilder:save', 'Save')}
                  onClick={handleSaveEntityConfig}
                  className="w-full"
                />
              </div>
                </Panel>
                {selected ? (
                  <Panel className="w-full basis-2/5">
                    <Inspector />
                  </Panel>
                ) : null}
              </div>
              </>
            )}
          </div>
        </div>
      </>
    </DndProvider>
  )
}

export default Builder
