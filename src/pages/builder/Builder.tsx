import { useTranslation } from 'react-i18next'
import React, { useState } from 'react'
import Panel from '../../core/components/common/Panel'
import { Dialog } from 'primereact/dialog'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { PlusIcon } from '@heroicons/react/24/outline'
import CustomCard from '../../core/components/common/CustomCard'

const Builder: React.FC = () => {
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState(false) // state for dialog

  async function showLayoutDialog() {
    setShowDialog(true)
  }

  async function handleLayoutClick(columns: number) {
    setShowDialog(false)
    console.log(`Selected layout with ${columns} columns`)
  }

  return (
    <>
      <Dialog
        header="Choose a block layout"
        visible={showDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowDialog(false)}
      >
        <div className="grid grid-cols-3 gap-4">
          <CustomCard
            key={'layout1'}
            title={'1 Column'}
            icon={
              <div className=" w-full h-full border-4 border-black bg-white"> </div>
            }
            className="mt-6 mb-6"
            onClick={() => handleLayoutClick(1)}
          />
          <CustomCard
            key={'layout2'}
            title={'2 Columns'}
            icon={
              <div className='flex flex-row h-full'>
                <div className="w-1/2 h-full border-4 border-black bg-white"> </div>
                <div className="w-1/2 h-full border-4 border-black bg-white"> </div>
              </div>
            }
            className="mt-6 mb-6"
            onClick={() => handleLayoutClick(2)}
          />
          <CustomCard
            key={'layout3'}
            title={'3 Columns'}
            icon={
              <div className='flex flex-row h-full'>
                <div className="w-1/3 h-full border-4 border-black bg-white"> </div>
                <div className="w-1/3 h-full border-4 border-black bg-white"> </div>
                <div className="w-1/3 h-full border-4 border-black bg-white"> </div>
              </div>
            }
            className="mt-6 mb-6"
            onClick={() => handleLayoutClick(3)}
          />
        </div>
      </Dialog>

      <div className="w-full">
        <h1 className="text-center">Ein Test!</h1>
        <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
          <Panel className="w-full basis-3/5">
            <PrimaryButton
              label={
                <span className="flex items-center gap-2">
                  <PlusIcon className="h-5 w-5" />
                  {'Hinzufügen'}
                </span>
              }
              onClick={() => showLayoutDialog()}
            />
          </Panel>
          <Panel className="w-full basis-2/5">inspector</Panel>
        </div>
      </div>
    </>
  )
}

export default Builder
