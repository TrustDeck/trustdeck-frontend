import { useTranslation } from 'react-i18next'
import React, { useState } from 'react'
import Panel from '../../core/components/common/Panel'
import { Dialog } from 'primereact/dialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import {
  PencilIcon,
  PlusIcon,
  ArrowLongUpIcon,
  ArrowLongDownIcon
} from '@heroicons/react/24/outline'

import ColumnCard from './components/ColumnCard'
import { Attribute, useEntityTypeStore } from './stores/EntityTypeStore'
import { defaultAttributes } from './configs/attributes'
import IconButton from './components/IconButton'
import Inspector from './components/Inspector'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'

const Builder: React.FC = () => {
  const { t } = useTranslation()
  const [showLayoutDialog, setShowLayoutDialog] = useState(false) // state for dialog
  const [showAttributesDialog, setShowAttributesDialog] = useState(false) // state for dialog

  const {
    selectedKey,
    setSelectedKey,
    entityType,
    attributes,
    appendAttribute,
    appendSubAttributes,
    overrideAttribute,
    moveAttribute,
    getSelectedAttribute
  } = useEntityTypeStore()

  const selected = getSelectedAttribute()
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
    appendAttribute({
      key: crypto.randomUUID(),
      group: addGroup,
      layout: 'col',
      ...(addGroup ? { name: 'ChangeMe' } : {})
    })
  }

  function getLayoutDialog() {
    return (
      <Dialog
        header="Choose a layout for the new row"
        visible={showLayoutDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowLayoutDialog(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColumnCard
            title={'1 Column'}
            columns={
              <div className=" w-full h-24 border-2 border-black bg-white"></div>
            }
            onClick={() => handleLayoutClick(1)}
          />
          <ColumnCard
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
        header="Choose a field"
        visible={showAttributesDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowAttributesDialog(false)}
      >
        {defaultAttributes.map((attribute) => (
          <div
            className="border p-4 mb-2 cursor-pointer"
            onClick={() => {
              //TODO use key to override the correct attribute and keep special details
              setShowAttributesDialog(false)
              overrideAttribute(selectedKey, attribute)
            }}
          >
            {attribute.name}
          </div>
        ))}
      </Dialog>
    )
  }

  function getLayoutField(cssWidthClass: string, attribute: Attribute) {
    return (
      <div
        className={`${cssWidthClass} border p-2 bg-white cursor-pointer flex flex-row justify-between items-center`}
        onClick={() => {
          setSelectedKey(attribute.key)
          if (attribute.name) {
            //load and show in inspector
            console.log(attribute)
          } else {
            setShowAttributesDialog(true)
          }
        }}
      >
        {attribute.name ? (
          <>
            <div>{attribute.name}</div>
            <PencilIcon className="h-5 w-5" />
          </>
        ) : (
          'Select a field'
        )}
      </div>
    )
  }

  function attributeSidebar(index: number, attributes: Attribute[]) {
    return (
      <div className="flex flex-col justify-between">
        {index !== 0 ? (
          <IconButton
            onClick={() => moveAttribute(index, index - 1)}
            icon={<ArrowLongUpIcon className="h-5 w-5" />}
          />
        ) : (
          <div className="h-1 w-1" />
        )}

        {index !== attributes.length - 1 ? (
          <IconButton
            onClick={() => moveAttribute(index, index + 1)}
            icon={<ArrowLongDownIcon className="h-5 w-5" />}
          />
        ) : (
          <div className="h-1 w-1" />
        )}
      </div>
    )
  }

  return (
    <>
      {getLayoutDialog()}
      {getAttributesDisplay()}
      <div className="w-full">
        <h1 className="text-center">
          {entityType == '' ? 'Change me' : entityType}
        </h1>
        <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
          <Panel
            className={`w-full ${selected && selected.name ? 'basis-3/5' : 'basis-full'}`}
          >
            <div className="grid grid-cols-2 gap-4 mt-8 items-center justify-center justify-items-center">
              <PrimaryOutlinedButton
                label={
                  <span className="flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" />
                    {'Add Block'}
                  </span>
                }
                onClick={() => handleAddGroup(false)}
              />
              <PrimaryOutlinedButton
                label={
                  <span className="flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" />
                    {'Add Group'}
                  </span>
                }
                onClick={() => handleAddGroup(true)}
              />
            </div>

            {attributes.map((attribute, index) => {
              return (
                <div className="mt-4 mb-8">
                  {attribute.group ? (
                    <div className="flex flex-row mb-4">
                      {attributeSidebar(index, attributes)}

                      <div className="border p-4 flex flex-grow flex-1 bg-gray-50">
                        <div className="flex flex-col w-full">
                          <div className="flex flex-col w-full">
                            <div className="flex flex-row justify-between mb-4 w-full">
                              <h3>{attribute.name ?? 'Group'}</h3>
                              <div>
                                <IconButton
                                  onClick={() => console.log('Edit Group')}
                                  icon={<PencilIcon className="h-5 w-5" />}
                                />
                              </div>
                            </div>
                            {attribute.attributes?.map((subAttr, subIndex) => (
                              <div key={subIndex} className="mb-2">
                                {subAttr.layout === 'row' &&
                                subAttr.attributes?.length === 3 ? (
                                  <div className="flex gap-2">
                                    {getLayoutField(
                                      'w-1/3',
                                      subAttr.attributes[0]
                                    )}
                                    {getLayoutField(
                                      'w-1/3',
                                      subAttr.attributes[1]
                                    )}
                                    {getLayoutField(
                                      'w-1/3',
                                      subAttr.attributes[2]
                                    )}
                                  </div>
                                ) : subAttr.layout === 'row' &&
                                  subAttr.attributes?.length === 2 ? (
                                  <div className="flex gap-2">
                                    {getLayoutField(
                                      'w-1/2',
                                      subAttr.attributes[0]
                                    )}
                                    {getLayoutField(
                                      'w-1/2',
                                      subAttr.attributes[1]
                                    )}
                                  </div>
                                ) : (
                                  <>{getLayoutField('w-full', subAttr)}</>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex w-full items-center justify-center mt-4">
                            <PrimaryButton
                              label={
                                <span className="flex items-center gap-2">
                                  <PlusIcon className="h-5 w-5" />
                                  {'Row'}
                                </span>
                              }
                              onClick={() => {
                                setSelectedKey(attribute.key)
                                setShowLayoutDialog(true)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row">
                      {attributeSidebar(index, attributes)}
                      <div className="border p-4 flex flex-grow flex-1 bg-gray-50">
                        {getLayoutField('w-full', attribute)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="mt-8 w-full">
              <PrimaryButton
                label={'Speichern'}
                onClick={() => handleAddGroup(false)}
                className="w-full"
              />
            </div>
          </Panel>
          {selected && selected.name ? (
            <Panel className="w-full basis-2/5">
              <Inspector />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default Builder
