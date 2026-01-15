import { Tree } from 'primereact/tree'
import { TreeNode } from 'primereact/treenode'
import { useEffect, useState, useCallback } from 'react'
import Panel from '../../core/components/common/Panel'
import Divider from '../../core/components/common/Divider'
import PrimaryOutlinedButton from '../../core/components/form/buttons/PrimaryOutlinedButton'
import GroupService from './service/GroupService'
import GroupOption from './components/GroupOption'
import { useTranslation } from 'react-i18next'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Dialog } from 'primereact/dialog'
import useProjectStore from '../../core/stores/ProjectStore'
import { useTreeStateStore } from './stores/TreeStateStore'
import { CustomTreeNode } from './types/CustomTreeNode'
import ConfirmDialog from '../../core/components/common/ConfirmDialog.tsx'
import useToastStore from '../../core/stores/ToastStore.ts'
import { findNodeByKey } from './utils/findNodeByKey.ts'
import { ProgressSpinner } from 'primereact/progressspinner'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton.tsx'

export default function GroupManager() {

  const {
    tree,
    setTree,
    setGroupOption,
    newNode,
    selectedNodeKey,
    setSelectedNodeKey,
    expandedKeys,
    setExpandedKeys,
    storeNodeChanges
  } = useTreeStateStore()

  //nodeTemplate is defined inside the component so it can access selectedNodeKey
  const nodeTemplate = useCallback(
    (node: TreeNode) => {
      const label = node.label ?? ''
      const maxLength = 14
      const isLong = label.length > maxLength
      const shortLabel = isLong ? label.slice(0, maxLength) + '…' : label

      const stored = (node as CustomTreeNode).data?.stored
      const isTemporal =
        stored === undefined ||
        (Array.isArray(stored)
          ? stored.length === 0
          : stored && typeof stored === 'object'
            ? Object.keys(stored).length === 0
            : false)

      const isSelected = String(node.key) === String(selectedNodeKey)
      const hasChanges = (node as CustomTreeNode).hasChanges
      let buttonStyle = ''
      if (hasChanges) {
        if (isSelected) {
          buttonStyle = `bg-color-coral hover:bg-color-coral/80 border-color-coral text-white border-dashed`
        } else {
          buttonStyle = `bg-white hover:bg-color-coral/80 border-color-coral text-color-coral border-dashed`
        }
      } else {
        if (isSelected) {
          if (isTemporal) {
            buttonStyle = `bg-blue-900 hover:bg-blue-900/80 border-blue-900 text-white border-dashed`
          } else {
            buttonStyle = `bg-blue-900 hover:bg-blue-900/80 border-blue-900 text-white border-solid`
          }
        } else {
          if (isTemporal) {
            buttonStyle = `bg-color-coral hover:bg-color-coral/80 border-color-coral text-color-coral border-dashed`
          } else {
            buttonStyle = `bg-white hover:bg-blue-900/80 border-blue-900 text-blue-900 hover:text-white border-solid`
          }
        }
      }

      return (
        <div className="relative inline-block group">
          <button
            className={`flex items-center px-4 py-2 rounded-md border-2 text-center justify-center
            w-[150px] overflow-hidden whitespace-nowrap text-ellipsis
            transition-colors duration-200 ${buttonStyle}
          `}
          >
            <span className="font-bold">{shortLabel}</span>
          </button>

          {/* this is just an hover effect */}
          {isLong && (
            <div
              className="absolute left-0 top-full mt-1 p-2 bg-white border border-gray-300 rounded-md
              whitespace-normal w-max max-w-xs shadow-lg opacity-0 group-hover:opacity-100
              pointer-events-none transition-opacity duration-300 z-50"
              style={{ whiteSpace: 'normal' }}
            >
              <span className="font-bold">{label}</span>
            </div>
          )}
        </div>
      )
    },
    [selectedNodeKey]
  )

  //TODO white is this ?
  const [visible, setVisible] = useState(false) // state for dialog
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveBeforeContinue, setShowSaveBeforeContinue] = useState(false)
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false)
  const { justCreated, setJustCreated } = useProjectStore()
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  // get all groups
  useEffect(() => {
    const fetchGroups = async () => {
      const groups = await GroupService.getGroups()
      setTree(groups as CustomTreeNode[])
    }

    fetchGroups()
    if (justCreated) setVisible(true)
    setJustCreated(false)
  }, [justCreated, setJustCreated])

  const confirmNewGroup = () => {
    setGroupOption('registration')
    newNode()
    setShowNewGroupDialog(false)
  }

  const handleNewGroup = () => {
    //check if temporal node already exists
    const temporalNode = tree.find((node) => node.key === 'temporal')
    if (temporalNode) {
      setShowNewGroupDialog(true)
    } else {
      setGroupOption('registration')
      newNode()
    }
  }

  const handleNoddeClick = (nodeKey: string) => {
    if (nodeKey === 'temporal') {
      setGroupOption('registration')
    } else {
      setGroupOption('edit')
    }
    setSelectedNodeKey(nodeKey ?? '')
  }

  const handleSaveBeforeContinue = () => {
    //get selected node do decide if its a create or an update

    const node = findNodeByKey(tree, selectedNodeKey) as CustomTreeNode
    if (node != undefined) {
      const stored = node.data?.stored
      const isTemporal =
        stored === undefined ||
        (Array.isArray(stored)
          ? stored.length === 0
          : stored && typeof stored === 'object'
            ? Object.keys(stored).length === 0
            : false)

      setIsSaving(true)
      setShowSaveBeforeContinue(false)
      //check if the prev node was temporal or not
      if (isTemporal) {
        //create new group
        const payload = {}
        GroupService.createGroup(payload)
          .then(() => {
            setIsSaving(false)
            storeNodeChanges()
            showToast({
              severity: 'success',
              summary: 'Success',
              detail: 'Group created successfully',
              life: 4000
            })
          })
          .catch((error) => {
            setIsSaving(false)
            setGroupOption('registration')
            console.error(error)
            showToast({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create group',
              life: 4000
            })
          })
      } else {
        //update existing group but only changes
        GroupService.updateGroups(tree, undefined)
          .then(() => {
            setIsSaving(false)
            storeNodeChanges()
            showToast({
              severity: 'success',
              summary: 'Success',
              detail: 'Group updated successfully',
              life: 4000
            })
          })
          .catch((error) => {
            console.error(error)
            setIsSaving(false)
            showToast({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update groups',
              life: 4000
            })
          })
      }
    } 
  }

  //TODO localize texts everywhere
  return (
    <>
      <ConfirmDialog
        visible={showNewGroupDialog}
        message="Möchtest du eine neuue Gruppe anlegen und die aktuellen Änderungen verwerfen?"
        header="Neue Gruppe anlegen?"
        label="Ja, Neue Gruppe anlegen"
        onHide={() => setShowNewGroupDialog(false)}
        onAccept={() => confirmNewGroup()}
      />
      <ConfirmDialog
        visible={showSaveBeforeContinue}
        message="Sie haben ungespeicherte Änderungen. Möchten Sie diese speichern, bevor Sie fortfahren?"
        header="Ungespeicherte Änderungen"
        label="Speichern"
        onHide={() => setShowSaveBeforeContinue(false)}
        onAccept={() => handleSaveBeforeContinue()}
      />
      <div className="w-full">
        <h1 className="text-center">{t('groups:headers.title')}</h1>
        <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
          <Panel className="w-full basis-3/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h2 className="mr-3">{t('groups:headers.left')}</h2>
                <QuestionMarkCircleIcon
                  className="h-5 w-5 mr-1 cursor-pointer"
                  onClick={() => setVisible(true)}
                />
              </div>
              <PrimaryOutlinedButton
                label={t('groups:buttons.newGroup')}
                onClick={() => handleNewGroup()}
              />
            </div>
            <Divider />
            <Tree
              value={tree}
              dragdropScope="groupManagerTree"
              nodeTemplate={nodeTemplate}
              expandedKeys={expandedKeys}
              onToggle={(e) => setExpandedKeys(e.value)}
              onNodeClick={(e) => {
                //look if the prev node that was clicked has changes to store them first
                const hasChanges = findNodeByKey(
                  tree,
                  selectedNodeKey
                )?.hasChanges
                if (hasChanges) {
                  setShowSaveBeforeContinue(true)
                } else {
                  handleNoddeClick(String(e.node.key))
                }
              }}
            />
          </Panel>

          <Panel className="w-full basis-2/5">
            {isSaving ? (
              <>
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                  <ProgressSpinner style={{ width: '60px', height: '60px' }} />
                </div>
                <p>{t('groups:savingGroup')}</p>
              </>
            ) : (
              <>
                <GroupOption />
              </>
            )}
          </Panel>

          {/* PrimeReact Dialog */}
          <Dialog
            header={t('groups:headers.modalHeader')}
            visible={visible}
            style={{ width: '50vw' }}
            onHide={() => setVisible(false)}
            footer={<PrimaryButton label={t('groups:buttons.okay')} onClick={() => setVisible(false)} />}
          >
            <p className="m-0">
              {t('groups:modal')}
            </p>
          </Dialog>
        </div>
      </div>
    </>
  )
}
