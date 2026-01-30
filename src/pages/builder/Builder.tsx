import { useTranslation } from 'react-i18next'
import React, { useCallback, useState } from 'react'
import Panel from '../../core/components/common/Panel'
import { Dialog } from 'primereact/dialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import ColumnCard from './components/ColumnCard'
import { Attribute, useEntityTypeStore } from './stores/EntityTypeStore'
import { defaultAttributes } from './configs/attributes'
import IconButton from './components/IconButton'
import Inspector from './components/Inspector'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { DragContainer } from './components/DragContainer'

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
    getSelectedAttribute,
    moveSubAttribute
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
        header="Choose a field"
        visible={showAttributesDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowAttributesDialog(false)}
      >
        {defaultAttributes.map((attribute) => (
          <div
            key={attribute.name}
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
          <h3>{attribute.name ?? 'Group'}</h3>
          {attribute.attributes?.map((subAttr: Attribute, subIndex: number) =>
            renderCard(
              {
                key: attribute.key,
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
    )
  }

  const moveCard = useCallback(
    (listId: string, dragIndex: number, hoverIndex: number) => {
      //implement this in store?
      console.log(
        `Move card in list ${listId} from ${dragIndex} to ${hoverIndex}`
      )
      moveSubAttribute(listId, dragIndex, hoverIndex)
    },
    []
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
        <div className="w-full">
          <h1 className="text-center">
            {entityType == '' ? 'Change me' : entityType}
          </h1>
          <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
            <Panel
              className={`w-full ${selected && selected.name ? 'basis-3/5' : 'basis-full'}`}
            >
              <div className="grid grid-cols-2 gap-4 my-4 items-center justify-center justify-items-center">
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
                  <div className="mt-2 mb-4">
                    {attribute.group
                      ? renderCard(
                          {
                            key: index + '-drag',
                            node: (
                              <>
                                <div className="flex flex-row flex-grow flex-1">
                                  <div className="border p-4 flex flex-grow flex-1 bg-gray-50">
                                    {subAttributeBlock(attribute)}
                                  </div>
                                  <div className="flex flex-col">
                                    <IconButton
                                      onClick={() => console.log('Edit Group')}
                                      icon={<PencilIcon className="h-5 w-5" />}
                                    />
                                    <IconButton
                                      onClick={() =>
                                        console.log('Delete Group')
                                      }
                                      icon={<TrashIcon className="h-5 w-5" />}
                                    />
                                  </div>
                                </div>
                              </>
                            )
                          },
                          index,
                          ''
                        )
                      : renderCard(
                          {
                            key: index + '-drag',
                            node: (
                              <>
                                <div className="flex flex-row flex-grow flex-1">
                                  <div className="border p-4 flex flex-grow flex-1 bg-gray-50">
                                    {getLayoutField('w-full', attribute)}
                                  </div>
                                </div>
                              </>
                            )
                          },
                          index,
                          ''
                        )}
                  </div>
                )
              })}

              <div className="mt-4 w-full">
                <PrimaryButton
                  label={'Speichern'}
                  onClick={() => console.log(attributes)}
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
    </DndProvider>
  )
}

export default Builder
